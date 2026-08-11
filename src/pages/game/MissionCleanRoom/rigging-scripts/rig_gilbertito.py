# Headless Blender rig+animate+export pipeline for a static (unrigged) humanoid GLB — see
# README §17 for the full write-up (why the built-in auto-weight operator doesn't work in
# --background mode, the landmark-measurement approach, the axis/roll conventions).
#
# Run with: blender --background --python rig_gilbertito.py -- <input.glb> <output.glb>
#
# NOT a generic multi-character tool: the HIP_Z/KNEE_Z/SHOULDER_Z/etc. landmarks below are
# specific to Gilbertito's mesh proportions, measured via analyze_silhouette.py (same folder).
# To rig Gael (or any other static character mesh) reuse the APPROACH, not this file verbatim:
#   1. Run analyze_silhouette.py against the new GLB, read off its own leg-split/shoulder/neck
#      bands (they won't match Gilbertito's — different mesh, different proportions).
#   2. Copy this script, swap in the new landmark values and the new bounding-box Z0/Z_MAX.
#   3. Keep the align_roll, distance-weighting, and Mesh.transform (not transform_apply) parts
#      as-is — those are the parts that are genuinely mesh-independent.
import bpy
import sys
import math
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
input_path = argv[0]
output_path = argv[1]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=input_path)

mesh_obj = next(o for o in bpy.context.scene.objects if o.type == 'MESH')

# --- Landmarks, derived from analyze_silhouette.py's real geometry scan (not guessed) ---
# Blender's importer converts glTF Y-up -> Blender Z-up, so height lives on Z here.
Z0 = -0.9508   # feet (floor)
Z_MAX = 0.9476  # head top
H = Z_MAX - Z0

def h(pct):
    return Z0 + (pct / 100.0) * H

HIP_Z = h(22.5)      # legs rejoin the torso here (silhouette goes from 2 clusters back to 1)
KNEE_Z = h(13.75)     # midpoint of the 2-cluster (split-leg) band, 7.5%-20%
ANKLE_Z = h(4)
SHOULDER_Z = h(60)   # widest torso band
NECK_Z = h(77.5)     # narrowest band just below the head
HEAD_BASE_Z = h(85)
ELBOW_Z = SHOULDER_Z - 0.18 * H
WRIST_Z = ELBOW_Z - 0.15 * H
LEG_X = 0.09          # half-distance between the two leg clusters at the split band
ARM_X = 0.17          # estimated shoulder half-width (torso widest-band half-width, pulled in from the outer silhouette edge)

print(f"HIP_Z={HIP_Z:.3f} KNEE_Z={KNEE_Z:.3f} ANKLE_Z={ANKLE_Z:.3f} SHOULDER_Z={SHOULDER_Z:.3f} "
      f"NECK_Z={NECK_Z:.3f} HEAD_BASE_Z={HEAD_BASE_Z:.3f} ELBOW_Z={ELBOW_Z:.3f} WRIST_Z={WRIST_Z:.3f}")

# --- Build the armature ---
armature_data = bpy.data.armatures.new("GilbertitoArmature")
armature_obj = bpy.data.objects.new("Armature", armature_data)
bpy.context.collection.objects.link(armature_obj)
bpy.context.view_layer.objects.active = armature_obj
bpy.ops.object.mode_set(mode='EDIT')
eb = armature_data.edit_bones

def add_bone(name, head, tail, parent=None, connect=False):
    b = eb.new(name)
    b.head = Vector(head)
    b.tail = Vector(tail)
    if parent:
        b.parent = eb[parent]
        b.use_connect = connect
    return b

add_bone('Hips', (0, 0, HIP_Z), (0, 0, HIP_Z + 0.08))
add_bone('Spine', (0, 0, HIP_Z), (0, 0, SHOULDER_Z), parent='Hips', connect=True)
add_bone('Chest', (0, 0, SHOULDER_Z), (0, 0, NECK_Z), parent='Spine', connect=True)
add_bone('Neck', (0, 0, NECK_Z), (0, 0, HEAD_BASE_Z), parent='Chest', connect=True)
add_bone('Head', (0, 0, HEAD_BASE_Z), (0, 0, Z_MAX), parent='Neck', connect=True)

for side, sx in (('Left', -1), ('Right', 1)):
    add_bone(f'{side}UpperArm', (sx * ARM_X, 0, SHOULDER_Z), (sx * ARM_X, 0, ELBOW_Z), parent='Chest')
    add_bone(f'{side}LowerArm', (sx * ARM_X, 0, ELBOW_Z), (sx * ARM_X, 0, WRIST_Z), parent=f'{side}UpperArm', connect=True)
    add_bone(f'{side}Hand', (sx * ARM_X, 0, WRIST_Z), (sx * ARM_X, 0, WRIST_Z - 0.08), parent=f'{side}LowerArm', connect=True)
    add_bone(f'{side}UpperLeg', (sx * LEG_X, 0, HIP_Z), (sx * LEG_X, 0, KNEE_Z), parent='Hips')
    add_bone(f'{side}LowerLeg', (sx * LEG_X, 0, KNEE_Z), (sx * LEG_X, 0, ANKLE_Z), parent=f'{side}UpperLeg', connect=True)
    # forward = Blender -Y here (mirrors the glTF +Z-forward convention Player3D.tsx already assumes)
    add_bone(f'{side}Foot', (sx * LEG_X, 0, ANKLE_Z), (sx * LEG_X, -0.12, Z0), parent=f'{side}LowerLeg', connect=True)

# align_roll so every limb bone's local Z axis points along world +X — gives a predictable,
# shared "bend" axis (rotate on local Z) for all the hinge joints below, instead of fighting
# Blender's default roll heuristic on nearly-vertical bones.
for name in eb.keys():
    if name not in ('Hips',):
        eb[name].align_roll(Vector((1, 0, 0)))

bpy.ops.object.mode_set(mode='OBJECT')
print("bones created:", list(armature_data.bones.keys()))

# --- Skin the mesh ---
# bpy.ops.object.parent_set(type='ARMATURE_AUTO') is Blender's own Bone Heat Weighting auto-skin
# — but like transform_apply earlier this session, it's a context operator that silently produces
# nothing in --background mode: it created vertex groups by name but assigned zero vertices to
# any of them (verified: 0/41317 vertices had a single group membership). Replacing it with a
# hand-written distance-based (envelope-style) weighting pass — for each vertex, weight by
# inverse-square distance to the 4 nearest bone segments — computed directly via the data API,
# so it doesn't depend on any operator/context machinery at all.
mesh_obj.parent = armature_obj
armature_mod = mesh_obj.modifiers.new(name='Armature', type='ARMATURE')
armature_mod.object = armature_obj

bone_segments = {bone.name: (bone.head_local.copy(), bone.tail_local.copy()) for bone in armature_data.bones}
vg_map = {name: mesh_obj.vertex_groups.new(name=name) for name in bone_segments}

def closest_point_on_segment(p, a, b):
    ab = b - a
    denom = ab.length_squared
    t = 0.0 if denom < 1e-9 else (p - a).dot(ab) / denom
    t = max(0.0, min(1.0, t))
    return a + ab * t

MAX_INFLUENCES = 4
to_armature_local = armature_obj.matrix_world.inverted() @ mesh_obj.matrix_world

for v in mesh_obj.data.vertices:
    p = to_armature_local @ v.co
    dists = []
    for name, (head, tail) in bone_segments.items():
        cp = closest_point_on_segment(p, head, tail)
        dists.append(((p - cp).length, name))
    dists.sort(key=lambda x: x[0])
    top = dists[:MAX_INFLUENCES]
    weights = [1.0 / max(d, 1e-4) ** 2 for d, _ in top]
    total = sum(weights)
    for (d, name), w in zip(top, weights):
        vg_map[name].add([v.index], w / total, 'REPLACE')

verts_with_weights = sum(1 for v in mesh_obj.data.vertices if len(v.groups) > 0)
print(f"vertices with >=1 group assignment: {verts_with_weights} / {len(mesh_obj.data.vertices)}")
sample = mesh_obj.data.vertices[0]
print("sample vertex 0 groups:", [(mesh_obj.vertex_groups[g.group].name, round(g.weight, 3)) for g in sample.groups])

# --- Animations ---
# Simple procedural keyframed clips — proof-of-concept quality (proving the rig deforms and the
# animation pipeline works end to end), not motion-captured/hand-animated polish. Every clip
# keyframes the SAME fixed bone set at every sample frame (even bones held at 0°) so clips are
# self-contained and don't bleed pose state into each other when Player3D crossfades between them.
FPS = 30
bpy.context.scene.render.fps = FPS

bpy.context.view_layer.objects.active = armature_obj
bpy.ops.object.mode_set(mode='POSE')
for pb in armature_obj.pose.bones:
    pb.rotation_mode = 'XYZ'

ANIMATED_BONES = [
    'Chest', 'Head',
    'LeftUpperArm', 'RightUpperArm', 'LeftLowerArm', 'RightLowerArm',
    'LeftUpperLeg', 'RightUpperLeg', 'LeftLowerLeg', 'RightLowerLeg',
]

def new_action(name):
    action = bpy.data.actions.new(name)
    if armature_obj.animation_data is None:
        armature_obj.animation_data_create()
    armature_obj.animation_data.action = action
    return action

def key_pose(frame, pose):
    """pose: dict bone_name -> (x_deg, y_deg, z_deg). Any bone in ANIMATED_BONES not in
    pose gets keyframed at (0,0,0), so every clip fully owns its own bone set."""
    for name in ANIMATED_BONES:
        x, y, z = pose.get(name, (0.0, 0.0, 0.0))
        pb = armature_obj.pose.bones[name]
        pb.rotation_euler = (math.radians(x), math.radians(y), math.radians(z))
        pb.keyframe_insert(data_path='rotation_euler', frame=frame)

def set_linear_interpolation(action):
    for fcurve in action.fcurves:
        for kp in fcurve.keyframe_points:
            kp.interpolation = 'LINEAR'

# IDLE — 61 frames (0..60 = 2s loop @30fps), subtle breathing sway.
act = new_action('Idle')
for f, t in [(0, 0.0), (30, 1.0), (60, 0.0)]:
    key_pose(f, {
        'Chest': (2.0 * t, 0, 0),
        'Head': (-1.0 * t, 0, 0),
        'LeftUpperArm': (0, 0, 3.0 * t),
        'RightUpperArm': (0, 0, -3.0 * t),
    })
set_linear_interpolation(act)

# WALK — 25 frames (0..24, ~0.8s loop @30fps), alternating leg/arm swing + knee lift.
act = new_action('Walk')
WALK_FRAMES = 24
LEG_SWING = 28.0
KNEE_BEND = 35.0
ARM_SWING = 22.0
SAMPLES = 8
for i in range(SAMPLES + 1):
    f = round(i * WALK_FRAMES / SAMPLES)
    phase = 2 * math.pi * i / SAMPLES
    left_leg = LEG_SWING * math.sin(phase)
    right_leg = -left_leg
    left_knee = KNEE_BEND * max(0.0, math.sin(phase))
    right_knee = KNEE_BEND * max(0.0, math.sin(phase + math.pi))
    key_pose(f, {
        'LeftUpperLeg': (0, 0, left_leg),
        'RightUpperLeg': (0, 0, right_leg),
        'LeftLowerLeg': (0, 0, -left_knee),
        'RightLowerLeg': (0, 0, -right_knee),
        'LeftUpperArm': (0, 0, -left_leg * (ARM_SWING / LEG_SWING)),
        'RightUpperArm': (0, 0, -right_leg * (ARM_SWING / LEG_SWING)),
        'Chest': (1.5 * math.sin(phase * 2), 0, 0),
    })
set_linear_interpolation(act)

# RUN — 15 frames (~0.5s loop @30fps, faster cycle than Walk), bigger swing + forward lean.
act = new_action('Run')
RUN_FRAMES = 14
RUN_LEG_SWING = 45.0
RUN_KNEE_BEND = 65.0
RUN_ARM_SWING = 35.0
for i in range(SAMPLES + 1):
    f = round(i * RUN_FRAMES / SAMPLES)
    phase = 2 * math.pi * i / SAMPLES
    left_leg = RUN_LEG_SWING * math.sin(phase)
    right_leg = -left_leg
    left_knee = RUN_KNEE_BEND * max(0.0, math.sin(phase))
    right_knee = RUN_KNEE_BEND * max(0.0, math.sin(phase + math.pi))
    key_pose(f, {
        'LeftUpperLeg': (0, 0, left_leg),
        'RightUpperLeg': (0, 0, right_leg),
        'LeftLowerLeg': (0, 0, -left_knee),
        'RightLowerLeg': (0, 0, -right_knee),
        'LeftUpperArm': (0, 0, -left_leg * (RUN_ARM_SWING / RUN_LEG_SWING)),
        'RightUpperArm': (0, 0, -right_leg * (RUN_ARM_SWING / RUN_LEG_SWING)),
        'Chest': (8.0, 0, 0),  # forward lean
    })
set_linear_interpolation(act)

# JUMP — 25 frames (~0.8s @30fps, close to one full jump arc so it rarely visibly loops
# mid-air): quick crouch, launch/extend, then a held airborne tuck.
act = new_action('Jump')
key_pose(0, {})
key_pose(6, {
    'LeftUpperLeg': (0, 0, 12), 'RightUpperLeg': (0, 0, 12),
    'LeftLowerLeg': (0, 0, -30), 'RightLowerLeg': (0, 0, -30),
    'Chest': (10, 0, 0),
    'LeftUpperArm': (0, 0, -20), 'RightUpperArm': (0, 0, 20),
})
key_pose(12, {
    'LeftUpperLeg': (0, 0, -15), 'RightUpperLeg': (0, 0, -15),
    'LeftLowerLeg': (0, 0, -10), 'RightLowerLeg': (0, 0, -10),
    'Chest': (-5, 0, 0),
    'LeftUpperArm': (0, 0, 40), 'RightUpperArm': (0, 0, -40),
})
key_pose(24, {
    'LeftUpperLeg': (0, 0, -8), 'RightUpperLeg': (0, 0, -8),
    'LeftLowerLeg': (0, 0, -20), 'RightLowerLeg': (0, 0, -20),
    'Chest': (-3, 0, 0),
    'LeftUpperArm': (0, 0, 25), 'RightUpperArm': (0, 0, -25),
})
set_linear_interpolation(act)

bpy.ops.object.mode_set(mode='OBJECT')
print("actions created:", [a.name for a in bpy.data.actions])

# Player3D.tsx positions the character group assuming feet sit at local Y=0 (matching the
# placeholder model's convention) — but this mesh is centered on the origin (feet at Z=-0.9508
# in Blender's frame). Shift the whole rig (armature object; mesh is parented to it, bones are
# in armature-local space so they move with it as one rigid unit) up so feet land at Z=0.
armature_obj.location.z = -Z0

bpy.ops.export_scene.gltf(filepath=output_path, export_format='GLB', export_animation_mode='ACTIONS')
print("DONE ->", output_path)
