# Adds Pickup / Carry / Place actions to an ALREADY-rigged character GLB (one that already has an
# Armature + skin + Idle/Walk/Run/Jump, produced by rig_gilbertito.py/rig_gael.py/rig_tutu.py).
# Doesn't touch skinning/weights at all — just imports, adds 3 more Actions on the same bone set
# those scripts already animate, and re-exports. Safe to run against any of the three rigs since
# they share bone names (Hips/Spine/Chest/Neck/Head, {Left,Right}{UpperArm,LowerArm,Hand},
# {Left,Right}{UpperLeg,LowerLeg,Foot}) — see README §17/§19.
#
# Run with: blender --background --python add_interaction_clips.py -- <input.glb> <output.glb>
import bpy
import sys
import math

argv = sys.argv[sys.argv.index("--") + 1:]
input_path = argv[0]
output_path = argv[1]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=input_path)

armature_obj = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
existing_actions = [a.name for a in bpy.data.actions]
print("existing actions:", existing_actions)

FPS = 30
bpy.context.scene.render.fps = FPS
bpy.context.view_layer.objects.active = armature_obj
bpy.ops.object.mode_set(mode='POSE')
for pb in armature_obj.pose.bones:
    pb.rotation_mode = 'XYZ'

# Same bone set the locomotion clips animate (rig_*.py) — every clip fully owns it so crossfading
# between any two clips never leaves a bone stuck at a stale rotation from a previous clip.
ANIMATED_BONES = [
    'Chest', 'Head',
    'LeftUpperArm', 'RightUpperArm', 'LeftLowerArm', 'RightLowerArm',
    'LeftUpperLeg', 'RightUpperLeg', 'LeftLowerLeg', 'RightLowerLeg',
]


def new_action(name):
    action = bpy.data.actions.new(name)
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


# HOLD_POSE — both arms bent up in front of the chest, as if cradling something. Reused as both
# Pickup's end pose and Carry's base pose so the Pickup->Carry handoff (driven at runtime by
# Player3D once the clip finishes) doesn't visibly pop.
HOLD_POSE = {
    'Chest': (4, 0, 0),
    'LeftUpperArm': (0, 0, 26),
    'RightUpperArm': (0, 0, -26),
    'LeftLowerArm': (0, 0, -18),
    'RightLowerArm': (0, 0, 18),
}

# PICKUP — one-shot (played with LoopOnce at runtime): crouch down and reach at ~55% (this is
# where Player3D fires the "attach item to hand" callback — see world3d/Player3D.tsx), then rise
# back up already holding the item. 24 frames @30fps (0.8s) — similar length to Jump.
act = new_action('Pickup')
key_pose(0, {})
key_pose(13, {  # ~55% — crouch + reach, hands near the ground. Kept deliberately modest (not a
    # deep crouch): a bigger bend brings the forearm close enough to the thigh that the
    # distance-based skinning (rig_gilbertito.py) blends some leg vertices onto the arm bone,
    # reading as a "lifted leg" glitch — see README §19 for the writeup.
    'Chest': (18, 0, 0),
    'Head': (-6, 0, 0),
    'LeftUpperArm': (0, 0, 28),
    'RightUpperArm': (0, 0, -28),
    'LeftLowerArm': (0, 0, -15),
    'RightLowerArm': (0, 0, 15),
    'LeftUpperLeg': (0, 0, 5),
    'RightUpperLeg': (0, 0, 5),
    'LeftLowerLeg': (0, 0, -14),
    'RightLowerLeg': (0, 0, -14),
})
key_pose(24, HOLD_POSE)  # standing back up, item now in hand
set_linear_interpolation(act)

# CARRY — loop, subtle sway/bob from the same HOLD_POSE base so it reads as "still holding it",
# not just a re-used Idle. 40 frames @30fps (~1.3s loop).
act = new_action('Carry')
for f, t in [(0, 0.0), (20, 1.0), (40, 0.0)]:
    key_pose(f, {
        'Chest': (HOLD_POSE['Chest'][0] + 2.0 * t, 0, 0),
        'LeftUpperArm': (0, 0, HOLD_POSE['LeftUpperArm'][2] + 4.0 * t),
        'RightUpperArm': (0, 0, HOLD_POSE['RightUpperArm'][2] - 4.0 * t),
        'LeftLowerArm': HOLD_POSE['LeftLowerArm'],
        'RightLowerArm': HOLD_POSE['RightLowerArm'],
    })
set_linear_interpolation(act)

# PLACE — one-shot, mirrors Pickup in reverse: starts from HOLD_POSE, bends down to set the item
# at the container (release callback fires at the same ~55% mark), then rises back to neutral.
act = new_action('Place')
key_pose(0, HOLD_POSE)
key_pose(13, {  # ~55% — crouched, releasing (same modest depth as Pickup's reach — see its comment)
    'Chest': (17, 0, 0),
    'Head': (-6, 0, 0),
    'LeftUpperArm': (0, 0, 26),
    'RightUpperArm': (0, 0, -26),
    'LeftLowerArm': (0, 0, -14),
    'RightLowerArm': (0, 0, 14),
    'LeftUpperLeg': (0, 0, 4),
    'RightUpperLeg': (0, 0, 4),
    'LeftLowerLeg': (0, 0, -11),
    'RightLowerLeg': (0, 0, -11),
})
key_pose(24, {})  # back to neutral, hands empty
set_linear_interpolation(act)

bpy.ops.object.mode_set(mode='OBJECT')
print("actions now:", [a.name for a in bpy.data.actions])

bpy.ops.export_scene.gltf(filepath=output_path, export_format='GLB', export_animation_mode='ACTIONS')
print("DONE ->", output_path)
