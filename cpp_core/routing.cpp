#include "routing.h"
#include <cmath>
#include <algorithm>
#include <vector>

namespace ufns {

int EvacuationRouter::find_safe_evacuation_path(
    const float* waypoints_in,
    int num_in_points,
    const float* depth_grid,
    int grid_width,
    int grid_height,
    float cell_size_m,
    float origin_x,
    float origin_y,
    float clearance_m,
    float* out_path_coords,
    int max_out_coords
) {
    if (!waypoints_in || num_in_points <= 0 || !out_path_coords || max_out_coords < num_in_points * 2) {
        return 0;
    }

    int written = 0;
    for (int i = 0; i < num_in_points; i++) {
        float wx = waypoints_in[i * 2];
        float wy = waypoints_in[i * 2 + 1];

        // Sample depth at coordinate
        int c = (int)((wx - origin_x) / cell_size_m);
        int r = (int)((wy - origin_y) / cell_size_m);
        float d = 0.0f;
        if (depth_grid && c >= 0 && c < grid_width && r >= 0 && r < grid_height) {
            d = depth_grid[r * grid_width + c];
        }

        // Avoid impassable water depth by slight orthogonal evasion vector
        if (d > clearance_m) {
            float evade_offset = (d - clearance_m) * 60.0f;
            wx += (i % 2 == 0 ? evade_offset : -evade_offset);
            wy += (i % 2 == 0 ? evade_offset * 0.5f : -evade_offset * 0.5f);
        }

        if (written + 2 <= max_out_coords) {
            out_path_coords[written++] = wx;
            out_path_coords[written++] = wy;
        }
    }

    return written / 2;
}

} // namespace ufns
