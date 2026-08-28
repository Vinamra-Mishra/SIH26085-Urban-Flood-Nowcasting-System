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

enum class EvacuationProfile {
    PEDESTRIAN = 0,
    PASSENGER_VEHICLE = 1,
    EMERGENCY_RESCUE = 2
};

class EvacuationRouter {
public:
    static int find_time_dependent_path(
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
    );
};

} // namespace ufns
