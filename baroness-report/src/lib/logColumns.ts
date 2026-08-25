export interface LogColumnDef {
  key: string;
  label: string;
  unit?: string;
}

// 쿼리 3-6 딕셔너리(한글 locale)의 항목/컬럼명 매핑을 그대로 옮김.
// bms_log의 실제 컬럼만 다루므로, /api/vehicle/log는 이 목록에 없는 key를 전부 거부한다.
export const BASIC_LOG_COLUMNS: LogColumnDef[] = [
  { key: "eg_time", label: "작동 시간", unit: "h" },
  { key: "mow_time", label: "MOW 시간", unit: "h" },
  { key: "reel_mt", label: "모어 역회전 시간", unit: "h" },
  { key: "uman_time", label: "무인 가동 시간", unit: "h" },
  { key: "uman_reel", label: "무인 절단 시간", unit: "h" },
  { key: "wk_area", label: "깎는 면적", unit: "m²" },
  { key: "op_mode", label: "작동 모드" },
  { key: "pb_prg", label: "진행도", unit: "%" },
  { key: "pb_est", label: "예상 종료 시간", unit: "min" },
  { key: "sys_mode", label: "동작 모드" },
  { key: "uni_posi", label: "유닛 위치" },
  { key: "fuel_lv", label: "남은 연료", unit: "%" },
  { key: "eg_fuelcons", label: "연료 소비율", unit: "L/HR" },
  { key: "fuel_cons", label: "연료 사용량", unit: "L" },
  { key: "bt_volt", label: "전압", unit: "V" },
  { key: "eg_wtemp", label: "수온", unit: "℃" },
  { key: "sog", label: "속도", unit: "km/h" },
  { key: "err_code", label: "오류 코드" },
  { key: "quality", label: "GNSS 상태" },
  { key: "head_type", label: "방위 타입" },
  { key: "num_sv", label: "위성 수" },
  { key: "age", label: "나이" },
  { key: "hdop", label: "Hdop" },
  { key: "slam_enb", label: "SLAM 상태" },
];

export const EXTENDED_LOG_COLUMNS: LogColumnDef[] = [
  { key: "roll", label: "롤 각도", unit: "°" },
  { key: "pitch", label: "피치 각도", unit: "°" },
  { key: "ster_ins", label: "타각 지시값", unit: "°" },
  { key: "ster_fb", label: "타각 피드백 값", unit: "°" },
  { key: "soot_perc", label: "매연 비율", unit: "%" },
  { key: "eg_hyd", label: "엔진 유압", unit: "kPa" },
  { key: "eg_dmtorq", label: "요구 엔진 토크", unit: "%" },
  { key: "eg_torq", label: "엔진 토크", unit: "%" },
  { key: "eg_lfac", label: "부하율", unit: "%" },
  { key: "eg_rpm", label: "엔진 속도", unit: "rpm" },
  { key: "trv_ins", label: "가속기 지시값", unit: "%" },
  { key: "trv_fb", label: "가속기 피드백 값", unit: "%" },
  { key: "eg_acel1", label: "가속 개도1", unit: "%" },
  { key: "eg_dmrpm", label: "엔진 지시 속도", unit: "rpm" },
  { key: "eg_thtop", label: "스로틀 개도", unit: "%" },
  { key: "eg_boost", label: "부스트 압력", unit: "kPa" },
  { key: "atms_press", label: "기압", unit: "kPa" },
  { key: "oside_temp", label: "외기 온도", unit: "℃" },
  { key: "inm_temp", label: "흡기 매니폴드 온도", unit: "℃" },
  { key: "inair_temp", label: "흡입 공기 온도", unit: "℃" },
  { key: "rail_press", label: "인젝터 레일 압력", unit: "kPa" },
  { key: "inair_vol", label: "흡입 공기량", unit: "kg/h" },
  { key: "doc_temp", label: "DOC 온도", unit: "℃" },
  { key: "dpf_temp1", label: "배기 필터 입구 온도", unit: "℃" },
  { key: "dpf_temp2", label: "배기 필터 출구 온도", unit: "℃" },
  { key: "dpf_difp", label: "DPF 차압", unit: "kPa" },
  { key: "dpf_lv", label: "DPF 상태" },
  { key: "dpf_st", label: "DPF 활성 재생 상태" },
  { key: "reg_st", label: "DPF 재생 금지 상태" },
  { key: "reg_sw", label: "DPF 재생 금지 SW" },
];

export const ALL_LOG_COLUMNS: LogColumnDef[] = [...BASIC_LOG_COLUMNS, ...EXTENDED_LOG_COLUMNS];

export const LOG_COLUMN_KEYS = new Set(ALL_LOG_COLUMNS.map((c) => c.key));

export function getLogColumnLabel(key: string): string {
  return ALL_LOG_COLUMNS.find((c) => c.key === key)?.label ?? key;
}

export const DEFAULT_SELECTED_LOG_COLUMNS = ["eg_time", "mow_time", "reel_mt", "roll"];
