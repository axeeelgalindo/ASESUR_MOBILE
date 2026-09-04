import React, { useState, useEffect, useMemo } from "react";
import { Modal, View, Text, TouchableOpacity, ScrollView, Dimensions } from "react-native";
import { MaterialIcons } from '@expo/vector-icons';

export const MONTHS = [
  { id: '01', name: "Enero", short: "Ene" },
  { id: '02', name: "Febrero", short: "Feb" },
  { id: '03', name: "Marzo", short: "Mar" },
  { id: '04', name: "Abril", short: "Abr" },
  { id: '05', name: "Mayo", short: "May" },
  { id: '06', name: "Junio", short: "Jun" },
  { id: '07', name: "Julio", short: "Jul" },
  { id: '08', name: "Agosto", short: "Ago" },
  { id: '09', name: "Septiembre", short: "Sep" },
  { id: '10', name: "Octubre", short: "Oct" },
  { id: '11', name: "Noviembre", short: "Nov" },
  { id: '12', name: "Diciembre", short: "Dic" },
];

const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

function getDaysInMonth(year, monthStr) {
  const y = parseInt(year, 10);
  const m = parseInt(monthStr, 10);
  if (!y || !m) return 31;
  return new Date(y, m, 0).getDate();
}

function getMonthStartDay(year, monthStr) {
  const y = parseInt(year, 10);
  const m = parseInt(monthStr, 10) - 1;
  if (!y || isNaN(m)) return 0;
  const day = new Date(y, m, 1).getDay(); // 0 is Sunday
  return day === 0 ? 6 : day - 1; // Convert so Monday is 0
}

export default function CalendarPickerModal({
  visible,
  title = "Seleccionar Fecha",
  initialDay = "",
  initialMonth = "",
  initialYear = "",
  onSelect,
  onClose,
  minYear = 1920,
  maxYear = new Date().getFullYear(),
}) {
  const [step, setStep] = useState("YEAR"); // 'YEAR' | 'MONTH' | 'DAY'
  const [selectedYear, setSelectedYear] = useState(initialYear || "");
  const [selectedMonth, setSelectedMonth] = useState(initialMonth || "");
  const [selectedDay, setSelectedDay] = useState(initialDay || "");

  // Generar lista de años descendente
  const years = useMemo(() => {
    const list = [];
    for (let y = maxYear; y >= minYear; y--) {
      list.push(String(y));
    }
    return list;
  }, [minYear, maxYear]);

  useEffect(() => {
    if (visible) {
      setSelectedYear(initialYear || "");
      setSelectedMonth(initialMonth || "");
      setSelectedDay(initialDay || "");
      // Siempre comenzar en YEAR como solicitó el usuario
      setStep("YEAR");
    }
  }, [visible, initialYear, initialMonth, initialDay]);

  const handleYearSelect = (year) => {
    setSelectedYear(year);
    setStep("MONTH");
  };

  const handleMonthSelect = (monthId) => {
    setSelectedMonth(monthId);
    setStep("DAY");
  };

  const handleDaySelect = (dayNum) => {
    const dayStr = String(dayNum).padStart(2, "0");
    setSelectedDay(dayStr);
    if (selectedYear && selectedMonth) {
      onSelect({
        day: dayStr,
        month: selectedMonth,
        year: selectedYear,
      });
      onClose();
    }
  };

  const handlePrevMonth = () => {
    const currentM = parseInt(selectedMonth || "1", 10);
    if (currentM === 1) {
      const prevYear = String(parseInt(selectedYear, 10) - 1);
      setSelectedYear(prevYear);
      setSelectedMonth("12");
    } else {
      setSelectedMonth(String(currentM - 1).padStart(2, "0"));
    }
  };

  const handleNextMonth = () => {
    const currentM = parseInt(selectedMonth || "1", 10);
    if (currentM === 12) {
      const nextYear = String(parseInt(selectedYear, 10) + 1);
      if (parseInt(nextYear, 10) <= maxYear) {
        setSelectedYear(nextYear);
        setSelectedMonth("01");
      }
    } else {
      setSelectedMonth(String(currentM + 1).padStart(2, "0"));
    }
  };

  const daysCount = useMemo(() => {
    return getDaysInMonth(selectedYear, selectedMonth || "01");
  }, [selectedYear, selectedMonth]);

  const startOffset = useMemo(() => {
    return getMonthStartDay(selectedYear, selectedMonth || "01");
  }, [selectedYear, selectedMonth]);

  const monthObj = useMemo(() => {
    return MONTHS.find((m) => m.id === selectedMonth) || MONTHS[0];
  }, [selectedMonth]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <View className="bg-white rounded-t-3xl h-[80%] pb-6 flex-col">
          {/* Header Superior del Modal */}
          <View className="px-6 pt-5 pb-3 border-b border-slate-100 flex-row items-center justify-between">
            <View>
              <Text className="text-lg font-black text-slate-900">{title}</Text>
              <Text className="text-xs font-semibold text-slate-400 mt-0.5">
                Paso {step === "YEAR" ? "1: Año" : step === "MONTH" ? "2: Mes" : "3: Día en Calendario"}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center">
              <MaterialIcons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Stepper Interactivo (Año -> Mes -> Día) */}
          <View className="flex-row items-center justify-between px-6 py-3 bg-slate-50 border-b border-slate-100">
            <TouchableOpacity
              onPress={() => setStep("YEAR")}
              className={`flex-1 py-2 px-2.5 rounded-xl flex-row items-center justify-center gap-1.5 border ${
                step === "YEAR" ? "bg-[#1152d4] border-[#1152d4]" : selectedYear ? "bg-white border-blue-200" : "bg-slate-100 border-slate-200"
              }`}
            >
              <MaterialIcons name="calendar-today" size={14} color={step === "YEAR" ? "#ffffff" : selectedYear ? "#1152d4" : "#94a3b8"} />
              <Text className={`text-xs font-bold ${step === "YEAR" ? "text-white" : selectedYear ? "text-[#1152d4]" : "text-slate-400"}`}>
                {selectedYear || "1. Año"}
              </Text>
            </TouchableOpacity>

            <MaterialIcons name="chevron-right" size={18} color="#cbd5e1" className="mx-1" />

            <TouchableOpacity
              onPress={() => selectedYear && setStep("MONTH")}
              disabled={!selectedYear}
              className={`flex-1 py-2 px-2.5 rounded-xl flex-row items-center justify-center gap-1.5 border ${
                step === "MONTH" ? "bg-[#1152d4] border-[#1152d4]" : selectedMonth ? "bg-white border-blue-200" : "bg-slate-100 border-slate-200 opacity-60"
              }`}
            >
              <MaterialIcons name="date-range" size={14} color={step === "MONTH" ? "#ffffff" : selectedMonth ? "#1152d4" : "#94a3b8"} />
              <Text className={`text-xs font-bold ${step === "MONTH" ? "text-white" : selectedMonth ? "text-[#1152d4]" : "text-slate-400"}`} numberOfLines={1}>
                {monthObj?.short ? `${monthObj.short}` : "2. Mes"}
              </Text>
            </TouchableOpacity>

            <MaterialIcons name="chevron-right" size={18} color="#cbd5e1" className="mx-1" />

            <TouchableOpacity
              onPress={() => selectedYear && selectedMonth && setStep("DAY")}
              disabled={!selectedYear || !selectedMonth}
              className={`flex-1 py-2 px-2.5 rounded-xl flex-row items-center justify-center gap-1.5 border ${
                step === "DAY" ? "bg-[#1152d4] border-[#1152d4]" : selectedDay ? "bg-white border-blue-200" : "bg-slate-100 border-slate-200 opacity-60"
              }`}
            >
              <MaterialIcons name="today" size={14} color={step === "DAY" ? "#ffffff" : selectedDay ? "#1152d4" : "#94a3b8"} />
              <Text className={`text-xs font-bold ${step === "DAY" ? "text-white" : selectedDay ? "text-[#1152d4]" : "text-slate-400"}`}>
                {selectedDay ? `Día ${selectedDay}` : "3. Día"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* CUERPO DEL SELECTOR SEGÚN EL PASO ACTIVO */}
          <View className="flex-1 p-5">
            {/* PASO 1: SELECCIÓN DE AÑO */}
            {step === "YEAR" && (
              <View className="flex-1">
                <Text className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">
                  Paso 1: Selecciona el año
                </Text>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                  <View className="flex-row flex-wrap gap-2.5 justify-between">
                    {years.map((y) => {
                      const isSelected = y === selectedYear;
                      return (
                        <TouchableOpacity
                          key={y}
                          onPress={() => handleYearSelect(y)}
                          activeOpacity={0.7}
                          className={`w-[22.5%] py-3.5 rounded-2xl items-center justify-center border ${
                            isSelected ? "bg-[#1152d4] border-[#1152d4] shadow-sm" : "bg-slate-50 border-slate-200 active:bg-blue-50"
                          }`}
                        >
                          <Text className={`font-black text-sm ${isSelected ? "text-white" : "text-slate-800"}`}>
                            {y}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* PASO 2: SELECCIÓN DE MES */}
            {step === "MONTH" && (
              <View className="flex-1">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-xs font-black text-slate-500 uppercase tracking-wider">
                    Paso 2: Selecciona el mes ({selectedYear})
                  </Text>
                  <TouchableOpacity onPress={() => setStep("YEAR")} className="px-2 py-1 bg-blue-50 rounded-lg">
                    <Text className="text-[11px] font-bold text-[#1152d4]">Cambiar Año</Text>
                  </TouchableOpacity>
                </View>
                <View className="flex-row flex-wrap gap-3 justify-between">
                  {MONTHS.map((m) => {
                    const isSelected = m.id === selectedMonth;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        onPress={() => handleMonthSelect(m.id)}
                        activeOpacity={0.7}
                        className={`w-[30.5%] py-5 rounded-2xl items-center justify-center border ${
                          isSelected ? "bg-[#1152d4] border-[#1152d4] shadow-md" : "bg-slate-50 border-slate-200 active:bg-blue-50"
                        }`}
                      >
                        <Text className={`text-[11px] font-bold uppercase mb-1 ${isSelected ? "text-blue-100" : "text-slate-400"}`}>
                          Mes {m.id}
                        </Text>
                        <Text className={`font-black text-sm ${isSelected ? "text-white" : "text-slate-800"}`}>
                          {m.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* PASO 3: CALENDARIO DE DÍAS */}
            {step === "DAY" && (
              <View className="flex-1">
                {/* Control de navegación del mes */}
                <View className="flex-row items-center justify-between mb-4 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                  <TouchableOpacity
                    onPress={handlePrevMonth}
                    className="w-10 h-10 rounded-xl bg-white border border-slate-200 items-center justify-center active:bg-slate-100"
                  >
                    <MaterialIcons name="chevron-left" size={24} color="#334155" />
                  </TouchableOpacity>

                  <View className="items-center">
                    <Text className="text-base font-black text-slate-900">
                      {monthObj.name} {selectedYear}
                    </Text>
                    <View className="flex-row gap-2 mt-0.5">
                      <TouchableOpacity onPress={() => setStep("MONTH")}>
                        <Text className="text-[11px] font-bold text-[#1152d4]">Cambiar Mes</Text>
                      </TouchableOpacity>
                      <Text className="text-[11px] text-slate-300">•</Text>
                      <TouchableOpacity onPress={() => setStep("YEAR")}>
                        <Text className="text-[11px] font-bold text-[#1152d4]">Cambiar Año</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={handleNextMonth}
                    className="w-10 h-10 rounded-xl bg-white border border-slate-200 items-center justify-center active:bg-slate-100"
                  >
                    <MaterialIcons name="chevron-right" size={24} color="#334155" />
                  </TouchableOpacity>
                </View>

                {/* Cabecera Días de la Semana */}
                <View className="flex-row justify-between mb-2 px-1">
                  {WEEKDAYS.map((wd) => (
                    <View key={wd} className="w-[13%] items-center">
                      <Text className="text-xs font-black text-slate-400 uppercase">{wd}</Text>
                    </View>
                  ))}
                </View>

                {/* Grid del Calendario */}
                <View className="flex-row flex-wrap justify-between px-1">
                  {/* Espacios vacíos antes del 1er día del mes */}
                  {Array.from({ length: startOffset }).map((_, idx) => (
                    <View key={`empty-${idx}`} className="w-[13%] h-11 mb-2" />
                  ))}

                  {/* Días del mes */}
                  {Array.from({ length: daysCount }).map((_, idx) => {
                    const dayNum = idx + 1;
                    const dayStr = String(dayNum).padStart(2, "0");
                    const isSelected = selectedDay === dayStr;

                    return (
                      <TouchableOpacity
                        key={`day-${dayNum}`}
                        onPress={() => handleDaySelect(dayNum)}
                        activeOpacity={0.7}
                        className={`w-[13%] h-11 mb-2 rounded-xl items-center justify-center border ${
                          isSelected ? "bg-[#1152d4] border-[#1152d4] shadow-md" : "bg-white border-slate-100 active:bg-blue-50"
                        }`}
                      >
                        <Text className={`font-black text-sm ${isSelected ? "text-white" : "text-slate-800"}`}>
                          {dayNum}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
