#include "solver_2d.h"
#include "optical_flow.h"
#include "routing.h"
#include <chrono>

UFNS_API int ufns_solve_inundation_2d(
    const float* dem,
    const uint8_t* land_mask,
    int width,
    int height,
    float cell_size_m,
    const char* scenario_id,
    int lead_minutes,
    float base_rain_rate_mmh,
    float drain_cap_mmh,
    float* out_depth,
    float* out_velocity_u,
    float* out_velocity_v,
    ufns::MassBalanceReport* out_report
) {
    return ufns::HydrodynamicSolver2D::solve_inundation_full(
        dem, land_mask, width, height, cell_size_m,
        scenario_id, lead_minutes, base_rain_rate_mmh, drain_cap_mmh,
        out_depth, out_velocity_u, out_velocity_v, out_report
    );
}

UFNS_API int ufns_compute_optical_flow(
    const float* prev_frame,
    const float* curr_frame,
    int width,
    int height,
    int num_pyramid_levels,
    int window_size,
    int iterations,
    float* out_flow_u,
    float* out_flow_v
) {
    return ufns::OpticalFlowFarneback::compute_dense_flow(
        prev_frame, curr_frame, width, height,
        num_pyramid_levels, window_size, iterations,
        out_flow_u, out_flow_v
    );
}

UFNS_API int ufns_evaluate_dynamic_route(
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
    return ufns::EvacuationRouter::find_time_dependent_path(
        waypoints_in, num_in_points, depth_grid, velocity_u, velocity_v,
        grid_width, grid_height, cell_size_m, origin_x, origin_y,
        profile_mode, out_path_coords, out_hazard_metrics, max_out_coords
    );
}
