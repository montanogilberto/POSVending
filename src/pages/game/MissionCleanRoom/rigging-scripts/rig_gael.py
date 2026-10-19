# Headless Blender rig+animate+export pipeline for Gael — copy of rig_gilbertito.py's APPROACH
# (see README §17) with landmarks re-measured against Gael's own mesh via analyze_silhouette.py.
# Gael's overall height (1.8985) matches Gilbertito's almost exactly, but proportions differ: legs
# rejoin the torso later (~27% vs ~22%) and the widest torso band is lower (~50% vs ~60%) — so the
# landmark values below are NOT copy-pasted from Gilbertito, they're re-derived from Gael's scan.
#
# Run with: blender --background --python rig_gael.py -- <input.glb> <output.glb>
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

# --- Landmarks, derived from analyze_silhouette.py's scan of gael.glb ---
Z0 = -0.9504    # feet (floor)
Z_MAX = 0.9481  # head top
H = Z_MAX - Z0

def h(pct):
    return Z0 + (pct / 100.0) * H

HIP_Z = h(26.5)      # clusters go 2->1 between 25% (still split) and 27.5% (rejoined)
KNEE_Z = h(16.0)      # midpoint of the leg-split span between ankle and hip
ANKLE_Z = h(5.0)      # feet/shoes occupy 0%-2.5% (high vertex count, wide flat soles)
SHOULDER_Z = h(50.0)  # widest band overall (xw width 0.532)
NECK_Z = h(82.5)      # narrowest band just below the head (width 0.153)
HEAD_BASE_Z = h(85.0) # still narrow; head silhouette widens again at 87.5%
ELBOW_Z = SHOULDER_Z - 0.18 * H
WRIST_Z = ELBOW_Z - 0.15 * H
LEG_X = 0.09           # half-distance between leg clusters (measured ~0.07-0.09 across split band)
ARM_X = 0.16            # shoulder half-width, pulled in from the outer (hand-inclusive) silhouette edge

print(f"HIP_Z={HIP_Z:.3f} KNEE_Z={KNEE_Z:.3f} ANKLE_Z={ANKLE_Z:.3f} SHOULDER_Z={SHOULDER_Z:.3f} "
      f"NECK_Z={NECK_Z:.3f} HEAD_BASE_Z={HEAD_BASE_Z:.3f} ELBOW_Z={ELBOW_Z:.3f} WRIST_Z={WRIST_Z:.3f}")

# --- Build the armature ---
armature_data = bpy.data.armatures.new("GaelArmature")
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
    add_bone(f'{side}Foot', (sx * LEG_X, 0, ANKLE_Z), (sx * LEG_X, -0.12, Z0), parent=f'{side}LowerLeg', connect=True)

for name in eb.keys():
    if name not in ('Hips',):
        eb[name].align_roll(Vector((1, 0, 0)))

bpy.ops.object.mode_set(mode='OBJECT')
print("bones created:", list(armature_data.bones.keys()))

# --- Skin the mesh (hand-written distance-based weighting — see rig_gilbertito.py header for why
# parent_set(type='ARMATURE_AUTO') doesn't work in --background mode) ---
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

# --- Animations (identical clip authoring to Gilbertito — same bone names, same procedural
# sine-based cycles; only the skeleton's rest pose differs per-character) ---
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
    for name in ANIMATED_BONES:
        x, y, z = pose.get(name, (0.0, 0.0, 0.0))
        pb = armature_obj.pose.bones[name]
        pb.rotation_euler = (math.radians(x), math.radians(y), math.radians(z))
        pb.keyframe_insert(data_path='rotation_euler', frame=frame)

def set_linear_interpolation(action):
    for fcurve in action.fcurves:
        for kp in fcurve.keyframe_points:
            kp.interpolation = 'LINEAR'

act = new_action('Idle')
for f, t in [(0, 0.0), (30, 1.0), (60, 0.0)]:
    key_pose(f, {
        'Chest': (2.0 * t, 0, 0),
        'Head': (-1.0 * t, 0, 0),
        'LeftUpperArm': (0, 0, 3.0 * t),
        'RightUpperArm': (0, 0, -3.0 * t),
    })
set_linear_interpolation(act)

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
        'Chest': (8.0, 0, 0),
    })
set_linear_interpolation(act)

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

# Feet-at-origin fix (same reasoning as rig_gilbertito.py — Player3D.tsx assumes feet at local Y=0)
armature_obj.location.z = -Z0

bpy.ops.export_scene.gltf(filepath=output_path, export_format='GLB', export_animation_mode='ACTIONS')
print("DONE ->", output_path)
