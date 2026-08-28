#pragma once

#include <vector>
#include <cstdint>
#include <cmath>
#include <algorithm>
#include <string>

#ifdef _WIN32
#define UFNS_API extern "C" __declspec(dllexport)
#else
#define UFNS_API extern "C" __attribute__((visibility("default")))
#endif

namespace ufns {

struct HydrodynamicState2D {
    std::vector<float> h;           // Depth (m)
    std::vector<float> hu;          // Momentum X (m^2/s)
    std::vector<float> hv;          // Momentum Y (m^2/s)
    std::vector<float> zb;          // Bed elevation (m)
    std::vector<float> rain;        // Rain forcing (m/s)
    std::vector<float> manning_n;    // Roughness n
    std::vector<float> infilt_cum;  // Cumulative infiltration F(t) (m)
    std::vector<float> k_sat;       // Hydraulic conductivity (m/s)
    std::vector<float> psi_theta;   // Wetting suction product (m)
    std::vector<float> q_exchange;  // 1D/2D exchange source (m/s)
    std::vector<uint8_t> land_mask; // 1 = Land, 0 = Ocean / Inactive
    int width = 0;
    int height = 0;
    float dx = 30.0f;
    float dy = 30.0f;
};

struct MassBalanceReport {
    double total_rainfall_m3 = 0.0;
    double total_infiltration_m3 = 0.0;
    double total_drainage_exchange_m3 = 0.0;
    double total_boundary_outflow_m3 = 0.0;
    double initial_volume_m3 = 0.0;
    double final_volume_m3 = 0.0;
    double mass_closure_error_pct = 0.0;
    double max_spurious_velocity_ms = 0.0;
    int total_timesteps = 0;
    float final_sim_time_s = 0.0f;
};

class HydrodynamicSolver2D {
public:
    static constexpr float GRAVITY = 9.80665f;
    static constexpr float H_WET = 0.005f;
    static constexpr float H_DRY = 0.0001f;
    static constexpr float H_MIN = 1.0e-6f;

    static constexpr float CFL_NUMBER = 0.45f;
    static constexpr float DT_MIN = 0.05f;
    static constexpr float DT_MAX = 5.0f;

    static float compute_time_step(const HydrodynamicState2D& state);

    static void advance_step(
        HydrodynamicState2D& state,
        float dt,
        MassBalanceReport& ledger
    );

    static int solve_inundation_full(
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
        MassBalanceReport* out_report
    );
};

} // namespace ufns
