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

class HydrodynamicSolver2D {
public:
    // High-speed vectorized 2D Shallow Water & Microtopography Inundation Solver
    static void solve_inundation(
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
    );
};

} // namespace ufns
