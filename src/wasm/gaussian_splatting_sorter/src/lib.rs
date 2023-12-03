// buffer sorter for gaussian splatting
use wasm_bindgen::prelude::*;
use js_sys::{Float32Array};
use web_sys::console;
// use wasm_bindgen::JsCast;
// use std::u8;
use std::slice;
use std::panic;

extern crate console_error_panic_hook;

struct Vec3 {
    x: f32,
    y: f32,
    z: f32
}

impl Clone for Vec3 {
    fn clone(&self) -> Self {
        Vec3 {
            x: self.x,
            y: self.y,
            z: self.z
        }
    }
}

struct Matrix4 {
    values: [f32; 16]
}

impl Clone for Matrix4 {
    fn clone(&self) -> Self {
        Matrix4 {
            values: self.values
        }
    }
}

struct SortResult {
    positions: Vec<f32>,
    rotations: Vec<f32>,
    colors: Vec<f32>,
    scales: Vec<f32>,
    num_instances: u32
}

// Global camera matrix
static mut camera_matrix: Matrix4 = Matrix4 {
    values: [0.0; 16]
};

static mut indices_buffer: Vec<u32> = Vec::new();
static mut distances_buffer: Vec<f32> = Vec::new();

static mut positions_buffer: Vec<f32> = Vec::new();
static mut rotations_buffer: Vec<f32> = Vec::new();
static mut colors_buffer: Vec<f32> = Vec::new();
static mut scales_buffer: Vec<f32> = Vec::new();

static mut sorted_positions_buffer: Vec<f32> = Vec::new();
static mut sorted_rotations_buffer: Vec<f32> = Vec::new();
static mut sorted_colors_buffer: Vec<f32> = Vec::new();
static mut sorted_scales_buffer: Vec<f32> = Vec::new();

fn transform_point(point: &Vec3, matrix: &Matrix4) -> Vec3 {
    let mut x = point.x * matrix.values[0] + point.y * matrix.values[1] + point.z * matrix.values[2] + matrix.values[3];
    let mut y = point.x * matrix.values[4] + point.y * matrix.values[5] + point.z * matrix.values[6] + matrix.values[7];
    let mut z = point.x * matrix.values[8] + point.y * matrix.values[9] + point.z * matrix.values[10] + matrix.values[11];
    let w = point.x * matrix.values[12] + point.y * matrix.values[13] + point.z * matrix.values[14] + matrix.values[15];

    x /= w;
    y /= w;
    z /= w;

    Vec3 { x, y, z }
}

fn get_depth(position: &Vec3, view_projection: &Matrix4) -> f32 {
    transform_point(position, view_projection).z
}

#[wasm_bindgen]
pub fn init() {
    panic::set_hook(Box::new(console_error_panic_hook::hook));
}

#[wasm_bindgen]
pub fn resize_buffers(num_points: u32) {
    unsafe {
        indices_buffer.resize(num_points as usize, 0);
        distances_buffer.resize(num_points as usize, 0.0);

        positions_buffer.resize(num_points as usize * 3, 0.0);
        rotations_buffer.resize(num_points as usize * 4, 0.0);
        colors_buffer.resize(num_points as usize * 4, 0.0);
        scales_buffer.resize(num_points as usize * 3, 0.0);

        sorted_positions_buffer.resize(num_points as usize * 3, 0.0);
        sorted_rotations_buffer.resize(num_points as usize * 4, 0.0);
        sorted_colors_buffer.resize(num_points as usize * 4, 0.0);
        sorted_scales_buffer.resize(num_points as usize * 3, 0.0);
    }
}

#[wasm_bindgen]
pub fn set_buffers(positions: JsValue, rotations: JsValue, colors: JsValue, scales: JsValue) {
    if positions.is_undefined() || positions.is_null() {
        panic!("Positions buffer is undefined or null");
    }

    if rotations.is_undefined() || rotations.is_null() {
        panic!("Rotations buffer is undefined or null");
    }

    if colors.is_undefined() || colors.is_null() {
        panic!("Colors buffer is undefined or null");
    }

    if scales.is_undefined() || scales.is_null() {
        panic!("Scales buffer is undefined or null");
    }

    unsafe {
        positions_buffer = Float32Array::from(positions).to_vec();
        rotations_buffer = Float32Array::from(rotations).to_vec();
        colors_buffer = Float32Array::from(colors).to_vec();
        scales_buffer = Float32Array::from(scales).to_vec();
    }
}

#[wasm_bindgen]
pub fn allocate_buffer(len: usize) -> *mut u8 {
    let mut memory = Vec::with_capacity(len);
    let ptr = memory.as_mut_ptr();

    // Prevent memory from being freed
    std::mem::forget(memory);

    ptr
}

#[wasm_bindgen]
pub fn deallocate_buffer(ptr: *mut u8, len: usize) {
    unsafe {
        let _ = Vec::from_raw_parts(ptr, len, len);
    }
}

#[wasm_bindgen]
pub fn get_num_instances() -> u32 {
    unsafe {
        positions_buffer.len() as u32 / 3
    }
}

#[wasm_bindgen]
pub fn get_positions() -> *mut f32 {
    unsafe {
        positions_buffer.as_mut_ptr()
    }
}

#[wasm_bindgen]
pub fn set_positions(ptr: *mut f32, len: usize) {
    unsafe {
        positions_buffer = Vec::from_raw_parts(ptr, len, len);
    }
}

#[wasm_bindgen]
pub fn get_rotations() -> *mut f32 {
    unsafe {
        rotations_buffer.as_mut_ptr()
    }
}

#[wasm_bindgen]
pub fn set_rotations(ptr: *mut f32, len: usize) {
    unsafe {
        rotations_buffer = Vec::from_raw_parts(ptr, len, len);
    }
}

#[wasm_bindgen]
pub fn get_colors() -> *mut f32 {
    unsafe {
        colors_buffer.as_mut_ptr()
    }
}

#[wasm_bindgen]
pub fn set_colors(ptr: *mut f32, len: usize) {
    unsafe {
        colors_buffer = Vec::from_raw_parts(ptr, len, len);
    }
}

#[wasm_bindgen]
pub fn get_scales() -> *mut f32 {
    unsafe {
        scales_buffer.as_mut_ptr()
    }
}

#[wasm_bindgen]
pub fn set_scales(ptr: *mut f32, len: usize) {
    unsafe {
        scales_buffer = Vec::from_raw_parts(ptr, len, len);
    }
}

#[wasm_bindgen]
pub fn get_sorted_positions() -> *const f32 {
    unsafe {
        sorted_positions_buffer.as_ptr()
    }
}

#[wasm_bindgen]
pub fn get_sorted_rotations() -> *const f32 {
    unsafe {
        sorted_rotations_buffer.as_ptr()
    }
}

#[wasm_bindgen]
pub fn get_sorted_colors() -> *const f32 {
    unsafe {
        sorted_colors_buffer.as_ptr()
    }
}

#[wasm_bindgen]
pub fn get_sorted_scales() -> *const f32 {
    unsafe {
        sorted_scales_buffer.as_ptr()
    }
}

#[wasm_bindgen]
pub fn set_camera_matrix(m00: f32, m01: f32, m02: f32, m03: f32,
                         m10: f32, m11: f32, m12: f32, m13: f32,
                         m20: f32, m21: f32, m22: f32, m23: f32,
                         m30: f32, m31: f32, m32: f32, m33: f32) {
    unsafe {
        camera_matrix.values = [
            m00, m01, m02, m03,
            m10, m11, m12, m13,
            m20, m21, m22, m23,
            m30, m31, m32, m33
        ];
    }
}

#[wasm_bindgen]
pub fn perform_sort() -> u32 {
    // Resize buffers if needed
    unsafe {
        let num_points = positions_buffer.len() / 3;

        if indices_buffer.len() < num_points {
            indices_buffer.resize(num_points, 0);
            distances_buffer.resize(num_points, 0.0);

            sorted_positions_buffer.resize(num_points * 3, 0.0);
            sorted_rotations_buffer.resize(num_points * 4, 0.0);
            sorted_colors_buffer.resize(num_points * 4, 0.0);
            sorted_scales_buffer.resize(num_points * 3, 0.0);
        }

        // Init indices, distances

        // Measure time to sort
        let mut start = js_sys::Date::now();

        for i in 0..num_points {
            indices_buffer[i] = i as u32;

            let position = Vec3 {
                x: positions_buffer[i * 3],
                y: positions_buffer[i * 3 + 1],
                z: positions_buffer[i * 3 + 2]
            };

            let depth_value = get_depth(&position, &camera_matrix);

            // check for NaN
            if depth_value != depth_value {
                panic!("Depth value is NaN for [{}, {}, {}] at index {}", position.x, position.y, position.z, i);

                distances_buffer[i] = 0.0;
                continue;
            }

            distances_buffer[i] = depth_value;
        }

        // Sort indices by distance so that farther points are drawn first
        indices_buffer.sort_by(|a, b| {
            let a_usize = *a as usize;
            let b_usize = *b as usize;

            distances_buffer[b_usize]
                .partial_cmp(&distances_buffer[a_usize])
                .unwrap()
        });

        let mut end = js_sys::Date::now();

        console::log_1(&format!("Sort time: {} ms", end - start).into());

        start = js_sys::Date::now();

        let mut num_instances: u32 = 0;

        for i in 0..num_points as usize {
            let index = indices_buffer[i] as usize;
            let distance = distances_buffer[index];

            if distance <= 0.0 {
                continue;
            }

            sorted_positions_buffer[i * 3] = positions_buffer[index * 3];
            sorted_positions_buffer[i * 3 + 1] = positions_buffer[index * 3 + 1];
            sorted_positions_buffer[i * 3 + 2] = positions_buffer[index * 3 + 2];

            sorted_rotations_buffer[i * 4] = rotations_buffer[index * 4];
            sorted_rotations_buffer[i * 4 + 1] = rotations_buffer[index * 4 + 1];
            sorted_rotations_buffer[i * 4 + 2] = rotations_buffer[index * 4 + 2];
            sorted_rotations_buffer[i * 4 + 3] = rotations_buffer[index * 4 + 3];

            sorted_colors_buffer[i * 4] = colors_buffer[index * 4];
            sorted_colors_buffer[i * 4 + 1] = colors_buffer[index * 4 + 1];
            sorted_colors_buffer[i * 4 + 2] = colors_buffer[index * 4 + 2];
            sorted_colors_buffer[i * 4 + 3] = colors_buffer[index * 4 + 3];

            sorted_scales_buffer[i * 3] = scales_buffer[index * 3];
            sorted_scales_buffer[i * 3 + 1] = scales_buffer[index * 3 + 1];
            sorted_scales_buffer[i * 3 + 2] = scales_buffer[index * 3 + 2];

            num_instances += 1;
        }

        end = js_sys::Date::now();

        console::log_1(&format!("Buffer update time: {} ms", end - start).into());

        num_instances
    }
}