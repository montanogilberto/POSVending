import bpy
import sys

argv = sys.argv[argv_index + 1:] if (argv_index := (sys.argv.index("--") if "--" in sys.argv else -1)) >= 0 else []
input_path = argv[0]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=input_path)

obj = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
mesh = obj.data
verts = [obj.matrix_world @ v.co for v in mesh.vertices]

# Blender's glTF importer converts the file's Y-up to Blender's Z-up on import, so the actual
# "height" axis here is Z, not Y (verified: v.y range was only ~0.5, matching the file's original
# Z/depth extent — the real ~1.9-unit height range is on v.z after import).
ys = [v.z for v in verts]
y_min, y_max = min(ys), max(ys)
height = y_max - y_min
print(f"Height(Z) range: {y_min:.4f} to {y_max:.4f} (height {height:.4f})")

# Slice into 40 horizontal bands, report width (X extent) and depth (Z extent) and
# vertex-cluster count (via simple X-gap detection) per band, to find where the
# silhouette splits into two columns (legs, arms) vs single column (torso/neck/head).
BANDS = 40
band_height = height / BANDS
for i in range(BANDS):
    band_y_lo = y_min + i * band_height
    band_y_hi = band_y_lo + band_height
    band_verts = [v for v in verts if band_y_lo <= v.z < band_y_hi]
    if not band_verts:
        continue
    xs = sorted(v.x for v in band_verts)
    x_min, x_max = xs[0], xs[-1]
    zs = [v.y for v in band_verts]  # depth axis (front/back) after Blender's Y-up->Z-up import
    z_min, z_max = min(zs), max(zs)

    # detect gap in sorted X values > 15% of total width => two separate clusters (e.g. two legs)
    width = x_max - x_min
    gap_threshold = max(width * 0.15, 0.02)
    clusters = 1
    biggest_gap = 0
    biggest_gap_at = None
    for a, b in zip(xs, xs[1:]):
        gap = b - a
        if gap > biggest_gap:
            biggest_gap = gap
            biggest_gap_at = (a + b) / 2
    if biggest_gap > gap_threshold:
        clusters = 2

    pct = (band_y_lo - y_min) / height * 100
    print(f"y%={pct:5.1f} y={band_y_lo:+.3f} n={len(band_verts):4d} xw=[{x_min:+.3f},{x_max:+.3f}] zw=[{z_min:+.3f},{z_max:+.3f}] clusters={clusters} gap={biggest_gap:.3f}@{biggest_gap_at if biggest_gap_at else 0:+.3f}")

print("DONE")
