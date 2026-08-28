#include "optical_flow.h"
#include <vector>
#include <cmath>
#include <algorithm>
#include <cstring>

namespace ufns {

int OpticalFlowFarneback::compute_dense_flow(
    const float* prev_frame,
    const float* curr_frame,
    int width,
    int height,
    int num_pyramid_levels,
    int window_size,
    int iterations_per_level,
    float* out_flow_u,
    float* out_flow_v
) {
    if (!prev_frame || !curr_frame || !out_flow_u || !out_flow_v || width <= 0 || height <= 0) {
        return -1;
    }

    const int total = width * height;
    std::fill(out_flow_u, out_flow_u + total, 0.0f);
    std::fill(out_flow_v, out_flow_v + total, 0.0f);

    int half_win = std::max(1, window_size / 2);

    #pragma omp parallel for schedule(guided, 32)
    for (int r = half_win; r < height - half_win; r++) {
        for (int c = half_win; c < width - half_win; c++) {
            float gxx = 0.0f, gyy = 0.0f, gxy = 0.0f;
            float gxt = 0.0f, gyt = 0.0f;

            for (int dy = -half_win; dy <= half_win; dy++) {
                for (int dx = -half_win; dx <= half_win; dx++) {
                    int idx = (r + dy) * width + (c + dx);
                    int idx_xp1 = (r + dy) * width + (c + dx + 1);
                    int idx_xm1 = (r + dy) * width + (c + dx - 1);
                    int idx_yp1 = (r + dy + 1) * width + (c + dx);
                    int idx_ym1 = (r + dy - 1) * width + (c + dx);

                    float ix = 0.5f * (curr_frame[idx_xp1] - curr_frame[idx_xm1]);
                    float iy = 0.5f * (curr_frame[idx_yp1] - curr_frame[idx_ym1]);
                    float it = curr_frame[idx] - prev_frame[idx];

                    float weight = std::exp(-(float)(dx * dx + dy * dy) / (2.0f * (float)(half_win * half_win)));

                    gxx += ix * ix * weight;
                    gyy += iy * iy * weight;
                    gxy += ix * iy * weight;
                    gxt += ix * it * weight;
                    gyt += iy * it * weight;
                }
            }

            float det = gxx * gyy - gxy * gxy + 1.0e-5f;
            int out_idx = r * width + c;
            out_flow_u[out_idx] = -(gyy * gxt - gxy * gyt) / det;
            out_flow_v[out_idx] = -(gxx * gyt - gxy * gxt) / det;
        }
    }

    return 0;
}

} // namespace ufns
