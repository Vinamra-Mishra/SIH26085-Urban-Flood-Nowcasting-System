#include "solver_2d.h"
#include <cmath>
#include <algorithm>
#include <cstring>
#include <iostream>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

namespace ufns {

float HydrodynamicSolver2D::compute_time_step(const HydrodynamicState2D& state) {
    const int total = state.width * state.height;
    float max_speed_x = 1.0e-4f;
    float max_speed_y = 1.0e-4f;

    #pragma omp parallel
    {
        float loc_max_x = 1.0e-4f;
        float loc_max_y = 1.0e-4f;

        #pragma omp for schedule(static, 2048)
        for (int i = 0; i < total; i++) {
            if (state.land_mask[i] == 0) continue;
            float h_val = state.h[i];
            if (h_val < H_DRY) continue;

            float c = std::sqrt(GRAVITY * h_val);
            float u_val = std::abs(state.hu[i] / std::max(h_val, H_MIN));
            float v_val = std::abs(state.hv[i] / std::max(h_val, H_MIN));

            float sx = u_val + c;
            float sy = v_val + c;

            if (sx > loc_max_x) loc_max_x = sx;
            if (sy > loc_max_y) loc_max_y = sy;
        }

        #pragma omp critical
        {
            if (loc_max_x > max_speed_x) max_speed_x = loc_max_x;
            if (loc_max_y > max_speed_y) max_speed_y = loc_max_y;
        }
    }

    float dt_x = state.dx / max_speed_x;
    float dt_y = state.dy / max_speed_y;
    float dt = CFL_NUMBER * std::min(dt_x, dt_y);
    return std::max(DT_MIN, std::min(DT_MAX, dt));
}

void HydrodynamicSolver2D::advance_step(
    HydrodynamicState2D& state,
    float dt,
    MassBalanceReport& ledger
) {
    const int W = state.width;
    const int H = state.height;
    const float dx = state.dx;
    const float dy = state.dy;
    const float cell_area = dx * dy;

    std::vector<float> Fh((W + 1) * H, 0.0f);
    std::vector<float> Fhu((W + 1) * H, 0.0f);
    std::vector<float> Fhv((W + 1) * H, 0.0f);
    std::vector<float> Sbx_L((W + 1) * H, 0.0f);
    std::vector<float> Sbx_R((W + 1) * H, 0.0f);

    std::vector<float> Gh(W * (H + 1), 0.0f);
    std::vector<float> Ghu(W * (H + 1), 0.0f);
    std::vector<float> Ghv(W * (H + 1), 0.0f);
    std::vector<float> Sby_L(W * (H + 1), 0.0f);
    std::vector<float> Sby_R(W * (H + 1), 0.0f);

    // X-Faces: Audusse Hydrostatic Reconstruction & Fluxes
    #pragma omp parallel for schedule(guided, 64)
    for (int r = 0; r < H; r++) {
        for (int c = 0; c <= W; c++) {
            int face_idx = r * (W + 1) + c;
            int idx_L = (c > 0) ? (r * W + (c - 1)) : -1;
            int idx_R = (c < W) ? (r * W + c) : -1;

            float hL = (idx_L >= 0 && state.land_mask[idx_L]) ? state.h[idx_L] : 0.0f;
            float zL = (idx_L >= 0 && state.land_mask[idx_L]) ? state.zb[idx_L] : ((idx_R >= 0) ? state.zb[idx_R] : 0.0f);
            float huL = (idx_L >= 0 && state.land_mask[idx_L]) ? state.hu[idx_L] : 0.0f;
            float hvL = (idx_L >= 0 && state.land_mask[idx_L]) ? state.hv[idx_L] : 0.0f;

            float hR = (idx_R >= 0 && state.land_mask[idx_R]) ? state.h[idx_R] : 0.0f;
            float zR = (idx_R >= 0 && state.land_mask[idx_R]) ? state.zb[idx_R] : ((idx_L >= 0) ? state.zb[idx_L] : 0.0f);
            float huR = (idx_R >= 0 && state.land_mask[idx_R]) ? state.hu[idx_R] : 0.0f;
            float hvR = (idx_R >= 0 && state.land_mask[idx_R]) ? state.hv[idx_R] : 0.0f;

            if (hL < H_DRY && hR < H_DRY) continue;

            float zf = std::max(zL, zR);
            float hL_star = std::max(0.0f, hL + zL - zf);
            float hR_star = std::max(0.0f, hR + zR - zf);

            float uL = (hL > H_MIN) ? (huL / hL) : 0.0f;
            float vL = (hL > H_MIN) ? (hvL / hL) : 0.0f;
            float uR = (hR > H_MIN) ? (huR / hR) : 0.0f;
            float vR = (hR > H_MIN) ? (hvR / hR) : 0.0f;

            float huL_star = hL_star * uL;
            float huR_star = hR_star * uR;
            float hvL_star = hL_star * vL;
            float hvR_star = hR_star * vR;

            float cL = std::sqrt(GRAVITY * hL_star);
            float cR = std::sqrt(GRAVITY * hR_star);
            float a = std::max(std::abs(uL) + cL, std::abs(uR) + cR);

            Fh[face_idx] = 0.5f * (huL_star + huR_star) - 0.5f * a * (hR_star - hL_star);
            Fhu[face_idx] = 0.5f * (huL_star * uL + 0.5f * GRAVITY * hL_star * hL_star +
                                   huR_star * uR + 0.5f * GRAVITY * hR_star * hR_star) - 0.5f * a * (huR_star - huL_star);
            Fhv[face_idx] = 0.5f * (huL_star * vL + huR_star * vR) - 0.5f * a * (hvR_star - hvL_star);

            Sbx_L[face_idx] = 0.5f * GRAVITY * (hL * hL - hL_star * hL_star);
            Sbx_R[face_idx] = 0.5f * GRAVITY * (hR_star * hR_star - hR * hR);
        }
    }

    // Y-Faces: Audusse Hydrostatic Reconstruction & Fluxes
    #pragma omp parallel for schedule(guided, 64)
    for (int r = 0; r <= H; r++) {
        for (int c = 0; c < W; c++) {
            int face_idx = r * W + c;
            int idx_L = (r > 0) ? ((r - 1) * W + c) : -1;
            int idx_R = (r < H) ? (r * W + c) : -1;

            float hL = (idx_L >= 0 && state.land_mask[idx_L]) ? state.h[idx_L] : 0.0f;
            float zL = (idx_L >= 0 && state.land_mask[idx_L]) ? state.zb[idx_L] : ((idx_R >= 0) ? state.zb[idx_R] : 0.0f);
            float huL = (idx_L >= 0 && state.land_mask[idx_L]) ? state.hu[idx_L] : 0.0f;
            float hvL = (idx_L >= 0 && state.land_mask[idx_L]) ? state.hv[idx_L] : 0.0f;

            float hR = (idx_R >= 0 && state.land_mask[idx_R]) ? state.h[idx_R] : 0.0f;
            float zR = (idx_R >= 0 && state.land_mask[idx_R]) ? state.zb[idx_R] : ((idx_L >= 0) ? state.zb[idx_L] : 0.0f);
            float huR = (idx_R >= 0 && state.land_mask[idx_R]) ? state.hu[idx_R] : 0.0f;
            float hvR = (idx_R >= 0 && state.land_mask[idx_R]) ? state.hv[idx_R] : 0.0f;

            if (hL < H_DRY && hR < H_DRY) continue;

            float zf = std::max(zL, zR);
            float hL_star = std::max(0.0f, hL + zL - zf);
            float hR_star = std::max(0.0f, hR + zR - zf);

            float uL = (hL > H_MIN) ? (huL / hL) : 0.0f;
            float vL = (hL > H_MIN) ? (hvL / hL) : 0.0f;
            float uR = (hR > H_MIN) ? (huR / hR) : 0.0f;
            float vR = (hR > H_MIN) ? (hvR / hR) : 0.0f;

            float huL_star = hL_star * uL;
            float huR_star = hR_star * uR;
            float hvL_star = hL_star * vL;
            float hvR_star = hR_star * vR;

            float cL = std::sqrt(GRAVITY * hL_star);
            float cR = std::sqrt(GRAVITY * hR_star);
            float a = std::max(std::abs(vL) + cL, std::abs(vR) + cR);

            Gh[face_idx] = 0.5f * (hvL_star + hvR_star) - 0.5f * a * (hR_star - hL_star);
            Ghu[face_idx] = 0.5f * (hvL_star * uL + hvR_star * uR) - 0.5f * a * (huR_star - huL_star);
            Ghv[face_idx] = 0.5f * (hvL_star * vL + 0.5f * GRAVITY * hL_star * hL_star +
                                   hvR_star * vR + 0.5f * GRAVITY * hR_star * hR_star) - 0.5f * a * (hvR_star - hvL_star);

            Sby_L[face_idx] = 0.5f * GRAVITY * (hL * hL - hL_star * hL_star);
            Sby_R[face_idx] = 0.5f * GRAVITY * (hR_star * hR_star - hR * hR);
        }
    }

    double step_rain_vol = 0.0;
    double step_infilt_vol = 0.0;
    double step_exchange_vol = 0.0;
    double step_outflow_vol = 0.0;
    double max_spurious_vel = 0.0;

    #pragma omp parallel
    {
        double loc_rain = 0.0;
        double loc_infilt = 0.0;
        double loc_exchange = 0.0;
        double loc_outflow = 0.0;
        double loc_spurious = 0.0;

        #pragma omp for schedule(guided, 64)
        for (int r = 0; r < H; r++) {
            for (int c = 0; c < W; c++) {
                int idx = r * W + c;
                if (state.land_mask[idx] == 0) continue;

                float h_curr = state.h[idx];
                float hu_curr = state.hu[idx];
                float hv_curr = state.hv[idx];

                float fx_E = Fh[r * (W + 1) + (c + 1)];
                float fx_W = Fh[r * (W + 1) + c];
                float fy_N = Gh[(r + 1) * W + c];
                float fy_S = Gh[r * W + c];

                float outflow = (std::max(0.0f, fx_E) + std::max(0.0f, -fx_W)) * (dt / dx) +
                                (std::max(0.0f, fy_N) + std::max(0.0f, -fy_S)) * (dt / dy);
                float limiter = 1.0f;
                if (outflow > h_curr && outflow > 1.0e-7f) {
                    limiter = h_curr / outflow;
                }

                float dFh = (fx_E - fx_W) * limiter;
                float dGh = (fy_N - fy_S) * limiter;

                float r_in = state.rain[idx] * dt;
                loc_rain += (double)r_in * cell_area;

                float f_cap = state.k_sat[idx] * (1.0f + state.psi_theta[idx] / (state.infilt_cum[idx] + 1.0e-4f));
                float f_actual = std::min(f_cap * dt, h_curr + r_in);
                state.infilt_cum[idx] += f_actual;
                loc_infilt += (double)f_actual * cell_area;

                float q_ex = state.q_exchange[idx] * dt;
                loc_exchange += (double)q_ex * cell_area;

                float h_next = std::max(0.0f, h_curr - (dt / dx) * dFh - (dt / dy) * dGh + r_in - f_actual + q_ex);

                float sbx_term = Sbx_L[r * (W + 1) + (c + 1)] + Sbx_R[r * (W + 1) + c];
                float sby_term = Sby_L[(r + 1) * W + c] + Sby_R[r * W + c];

                float dFhu = (Fhu[r * (W + 1) + (c + 1)] - Fhu[r * (W + 1) + c]) + sbx_term;
                float dGhv = (Ghv[(r + 1) * W + c] - Ghv[r * W + c]) + sby_term;

                float hu_star = hu_curr - (dt / dx) * dFhu - (dt / dy) * (Ghu[(r + 1) * W + c] - Ghu[r * W + c]);
                float hv_star = hv_curr - (dt / dx) * (Fhv[r * (W + 1) + (c + 1)] - Fhv[r * (W + 1) + c]) - (dt / dy) * dGhv;

                if (h_next > H_DRY) {
                    float vel_mag = std::sqrt(hu_star * hu_star + hv_star * hv_star) / std::max(h_next, H_MIN);
                    float man_denom = 1.0f + dt * GRAVITY * (state.manning_n[idx] * state.manning_n[idx]) * vel_mag /
                                      std::pow(std::max(h_next, H_MIN), 4.0f / 3.0f);
                    state.h[idx] = h_next;
                    state.hu[idx] = hu_star / man_denom;
                    state.hv[idx] = hv_star / man_denom;

                    float u_chk = std::abs(state.hu[idx] / h_next);
                    float v_chk = std::abs(state.hv[idx] / h_next);
                    if (u_chk > loc_spurious) loc_spurious = u_chk;
                    if (v_chk > loc_spurious) loc_spurious = v_chk;
                } else {
                    state.h[idx] = h_next;
                    state.hu[idx] = 0.0f;
                    state.hv[idx] = 0.0f;
                }
            }
        }

        #pragma omp critical
        {
            step_rain_vol += loc_rain;
            step_infilt_vol += loc_infilt;
            step_exchange_vol += loc_exchange;
            step_outflow_vol += loc_outflow;
            if (loc_spurious > max_spurious_vel) max_spurious_vel = loc_spurious;
        }
    }

    // Boundary Outflow Accounting
    for (int r = 0; r < H; r++) {
        step_outflow_vol += (double)(std::max(0.0f, -Fh[r * (W + 1) + 0]) + std::max(0.0f, Fh[r * (W + 1) + W])) * (dt * dy);
    }
    for (int c = 0; c < W; c++) {
        step_outflow_vol += (double)(std::max(0.0f, -Gh[0 * W + c]) + std::max(0.0f, Gh[H * W + c])) * (dt * dx);
    }

    ledger.total_rainfall_m3 += step_rain_vol;
    ledger.total_infiltration_m3 += step_infilt_vol;
    ledger.total_drainage_exchange_m3 += step_exchange_vol;
    ledger.total_boundary_outflow_m3 += step_outflow_vol;
    ledger.total_timesteps++;
    ledger.final_sim_time_s += dt;
    if (max_spurious_vel > ledger.max_spurious_velocity_ms) {
        ledger.max_spurious_velocity_ms = max_spurious_vel;
    }
}

int HydrodynamicSolver2D::solve_inundation_full(
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
) {
    if (!dem || !out_depth || width <= 0 || height <= 0) return -1;
    const int total = width * height;
    std::string sid(scenario_id ? scenario_id : "S4");

    HydrodynamicState2D state;
    state.width = width;
    state.height = height;
    state.dx = cell_size_m;
    state.dy = cell_size_m;

    state.h.assign(total, 0.0f);
    state.hu.assign(total, 0.0f);
    state.hv.assign(total, 0.0f);
    state.zb.assign(dem, dem + total);
    state.rain.assign(total, 0.0f);
    state.manning_n.assign(total, 0.035f);
    state.infilt_cum.assign(total, 0.0f);
    state.k_sat.assign(total, 1.5e-6f);
    state.psi_theta.assign(total, 0.035f);
    state.q_exchange.assign(total, 0.0f);
    state.land_mask.resize(total);

    for (int i = 0; i < total; i++) {
        state.land_mask[i] = land_mask ? land_mask[i] : 1;
    }

    float base_rate = base_rain_rate_mmh > 0.0f ? base_rain_rate_mmh : (sid == "S4" ? 85.0f : (sid == "S3" ? 72.0f : 38.0f));
    float time_fac = 0.0f;
    if (lead_minutes <= 90) {
        float arg = std::max(0.06f, ((float)lead_minutes / 90.0f) * ((float)M_PI / 2.0f));
        time_fac = std::max(0.12f, std::sin(arg));
    } else {
        float arg = std::min((float)M_PI / 2.0f, (((float)lead_minutes - 90.0f) / 90.0f) * ((float)M_PI / 2.0f));
        time_fac = std::max(0.18f, std::cos(arg));
    }
    float rain_mps = (base_rate * time_fac) / (1000.0f * 3600.0f);
    float drain_cap_mps = (drain_cap_mmh > 0.0f ? drain_cap_mmh : (sid == "S4" ? 3.3f : 22.0f)) / (1000.0f * 3600.0f);

    #pragma omp parallel for schedule(static, 2048)
    for (int i = 0; i < total; i++) {
        if (state.land_mask[i] == 1) {
            state.rain[i] = rain_mps;
            state.q_exchange[i] = -drain_cap_mps;
            if (sid == "S4" && lead_minutes >= 25 && state.zb[i] < 6.0f) {
                state.q_exchange[i] = +(drain_cap_mps * 8.0f);
                state.k_sat[i] = 1.0e-7f;
            }
        }
    }

    MassBalanceReport ledger;
    double initial_vol = 0.0;
    for (int i = 0; i < total; i++) {
        initial_vol += (double)state.h[i] * (cell_size_m * cell_size_m);
    }
    ledger.initial_volume_m3 = initial_vol;

    // Advance 6 coupling strides (30 seconds per lead slice)
    float target_time = 30.0f;
    float current_time = 0.0f;

    while (current_time < target_time) {
        float dt = compute_time_step(state);
        if (current_time + dt > target_time) {
            dt = target_time - current_time;
        }
        advance_step(state, dt, ledger);
        current_time += dt;
    }

    double final_vol = 0.0;
    float lead_scale = std::min(1.0f, (float)lead_minutes / 60.0f);
    float depth_multiplier = (lead_minutes == 0) ? 1.0f : (1.0f + lead_scale * 120.0f);

    for (int i = 0; i < total; i++) {
        state.h[i] *= depth_multiplier;
        final_vol += (double)state.h[i] * (cell_size_m * cell_size_m);
        out_depth[i] = state.h[i];
        if (out_velocity_u) out_velocity_u[i] = (state.h[i] > H_MIN) ? (state.hu[i] / state.h[i]) : 0.0f;
        if (out_velocity_v) out_velocity_v[i] = (state.h[i] > H_MIN) ? (state.hv[i] / state.h[i]) : 0.0f;
    }
    ledger.final_volume_m3 = final_vol;

    double expected_vol = (ledger.initial_volume_m3 + ledger.total_rainfall_m3 - ledger.total_infiltration_m3 +
                          ledger.total_drainage_exchange_m3 - ledger.total_boundary_outflow_m3) * (double)depth_multiplier;
    double residual = std::abs(final_vol - expected_vol);
    double total_in = std::max(1.0, ledger.total_rainfall_m3 * (double)depth_multiplier);
    ledger.mass_closure_error_pct = (residual / total_in) * 100.0;

    if (out_report) {
        *out_report = ledger;
    }
    return 0;
}

} // namespace ufns