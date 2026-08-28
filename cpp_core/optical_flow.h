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

class OpticalFlowFarneback {
public:
    static int compute_dense_flow(
        const float* prev_frame,
        const float* curr_frame,
        int width,
        int height,
        int num_pyramid_levels,
        int window_size,
        int iterations_per_level,
        float* out_flow_u,
        float* out_flow_v
    );
};

} // namespace ufns
