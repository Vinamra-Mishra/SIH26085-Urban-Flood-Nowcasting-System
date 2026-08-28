#include "solver_2d.h"
#include "routing.h"
#include <chrono>

UFNS_API void ufns_solve_inundation_2d(
    const float* dem,
    const uint8_t* land_mask,
    int width,
    int height,
    float cell_size_m,
    const char* scenario_id,
    int lead_minutes,
    float base_rain_rate_mmh,
    float drain_cap_mmh,
    float* out_depth
) {
    ufns::HydrodynamicSolver2D::solve_inundation(
        dem, land_mask, width, height, cell_size_m,
        scenario_id, lead_minutes, base_rain_rate_mmh, drain_cap_mmh,
        out_depth
    );
}

UFNS_API int ufns_evaluate_evacuation_path(
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
    return ufns::EvacuationRouter::find_safe_evacuation_path(
        waypoints_in, num_in_points, depth_grid,
        grid_width, grid_height, cell_size_m,
        origin_x, origin_y, clearance_m,
        out_path_coords, max_out_coords
    );
}

UFNS_API double ufns_benchmark_solver_perf(
    const float* dem,
    const uint8_t* land_mask,
    int width,
    int height,
    float* out_depth
) {
    auto t0 = std::chrono::high_resolution_clock::now();
    for (int iter = 0; iter < 10; iter++) {
        ufns::HydrodynamicSolver2D::solve_inundation(
            dem, land_mask, width, height, 30.0f,
            "S4", 60, 85.0f, 3.3f, out_depth
        );
    }
    auto t1 = std::chrono::high_resolution_clock::now();
    double ms = std::chrono::duration<double, std::milli>(t1 - t0).count() / 10.0;
    return ms;
}
