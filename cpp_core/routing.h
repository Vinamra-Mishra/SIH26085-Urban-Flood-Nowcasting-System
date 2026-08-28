#pragma once

#include <vector>
#include <cstdint>
#include <cmath>

#ifdef _WIN32
#define UFNS_API extern "C" __declspec(dllexport)
#else
#define UFNS_API extern "C" __attribute__((visibility("default")))
#endif

namespace ufns {

struct Waypoint {
    float x;
    float y;
    float depth_m;
    float speed_kmh;
};

class EvacuationRouter {
public:
    static int find_safe_evacuation_path(
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
    );
};

} // namespace ufns
