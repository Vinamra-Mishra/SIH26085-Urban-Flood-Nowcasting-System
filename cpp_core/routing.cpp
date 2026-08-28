#include "routing.h"
#include <cmath>
#include <algorithm>
#include <vector>

namespace ufns {

int EvacuationRouter::find_time_dependent_path(
    const float* waypoints_in,
    int num_in_points,
    const float* depth_grid,
    const float* velocity_u,
    const float* velocity_v,
    int grid_width,
    int grid_height,
    float cell_size_m,
    float origin_x,
    float origin_y,
    int profile_mode,
    float* out_path_coords,
    float* out_hazard_metrics,
    int max_out_coords
) {
    if (!waypoints_in || num_in_points <= 0 || !out_path_coords || max_out_coords < num_in_points * 2) {
        return 0;
    }

    float max_depth = 0.20f;
    float max_dv = 0.35f;

    if (profile_mode == (int)EvacuationProfile::PEDESTRIAN) {
        max_depth = 0.10f;
        max_dv = 0.25f;
    } else if (profile_mode == (int)EvacuationProfile::EMERGENCY_RESCUE) {
        max_depth = 0.40f;
        max_dv = 0.60f;
    }

    int written = 0;
    for (int i = 0; i < num_in_points; i++) {
        float wx = waypoints_in[i * 2];
        float wy = waypoints_in[i * 2 + 1];

        int c = (int)((wx - origin_x) / cell_size_m);
        int r = (int)((wy - origin_y) / cell_size_m);
        float d = 0.0f;
        float dv = 0.0f;

        if (c >= 0 && c < grid_width && r >= 0 && r < grid_height) {
            int idx = r * grid_width + c;
            d = depth_grid ? depth_grid[idx] : 0.0f;
            float u = velocity_u ? velocity_u[idx] : 0.0f;
            float v = velocity_v ? velocity_v[idx] : 0.0f;
            float vel = std::sqrt(u * u + v * v);
            dv = d * vel;
        }

        if (d > max_depth || dv > max_dv) {
            float evade_offset = (d - max_depth) * 80.0f + 20.0f;
            wx += (i % 2 == 0 ? evade_offset : -evade_offset);
            wy += (i % 2 == 0 ? evade_offset * 0.5f : -evade_offset * 0.5f);
        }

        if (written + 2 <= max_out_coords) {
            out_path_coords[written] = wx;
            out_path_coords[written + 1] = wy;
            if (out_hazard_metrics) {
                out_hazard_metrics[written / 2] = dv;
            }
            written += 2;
        }
    }

    return written / 2;
}

} // namespace ufns
