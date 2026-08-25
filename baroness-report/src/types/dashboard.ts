export interface PlatformUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
}

export interface Notice {
  [key: string]: unknown;
}

export interface VehicleStatusRow {
  collect_datetime: string | null;
  op_mode: string | null;
  sensor_id: string;
  vehicle_id: string;
  specification: string | null;
  group_nm: string | null;
  eg_time: number | null;
  uman_time: number | null;
  condition: "online" | "offline";
  data_time: string | null;
  notes: string | null;
}

export interface AlertRow {
  collect_datetime: string | null;
  op_mode_m: string | null;
  vehicle: string;
  vehicle_id: string;
  group: string | null;
  group_nm: string | null;
  alert_m: string | null;
  alert: string | null;
  data_time: string | null;
  notes: string | null;
}

export interface VehicleDetail {
  collect_datetime: string | null;
  op_mode: string | null;
  sys_mode: string | null;
  uni_posi: string | null;
  fuel_lv: number | null;
  sog: number | null;
  pb_data: string | null;
  pb_prg: number | null;
  pb_est: number | null;
  alert_m: string | null;
  lat: number | null;
  lon: number | null;
}

export interface LocationPoint {
  collect_datetime: string;
  lat: number;
  lon: number;
}

export interface ChartPoint {
  datatime: string;
  fuel_lv: number | null;
  sog: number | null;
  pb_prg: number | null;
  pb_est: number | null;
}

export interface LogDataPoint {
  datatime: string;
  [column: string]: string | number | null;
}

export interface AlertDetail {
  collect_datetime: string | null;
  op_mode: string | null;
  sys_mode: string | null;
  uni_posi: string | null;
  fuel_lv: number | null;
  sog: number | null;
  pb_data: string | null;
  pb_prg: number | null;
  pb_est: number | null;
  alert_m: string | null;
  lat: number | null;
  lon: number | null;
  eg_time: number | null;
  eg_rpm: number | null;
  roll: number | null;
  pitch: number | null;
  oside_temp: number | null;
  quality: string | null;
  head_type: string | null;
  num_sv: number | null;
  age: number | null;
  hdop: number | null;
  bt_volt: number | null;
  eg_wtemp: number | null;
  ster_ins: number | null;
  ster_fb: number | null;
  trv_ins: number | null;
  trv_fb: number | null;
}

export interface AlertTimelineEntry {
  collect_datetime: string;
  alert_m: string | null;
  lat: number | null;
  lon: number | null;
}
