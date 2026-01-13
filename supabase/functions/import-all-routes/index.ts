// deno-lint-ignore-file no-explicit-any
import { json, corsHeaders } from "../_shared/http.ts";
import { createAdminClient, createAuthedClient } from "../_shared/supabase.ts";
import { normalizeHeader, parseCsv, parseDurationToMinutes, pick } from "../_shared/csv.ts";

// Embedded CSV data - all routes
const CSV_DATA = `Flight Number,Code,Departure City,Arrival City,DEP. ICAO,ARR ICAO,Aircraft,Duration,Remarks,LMT
SU150,Historic,Moscow (SVO),Havana (HAV),UUEE,MUHA,A359,14:05,,12/12/2025 3:00pm
SU159,Historic,Cancun (CUN),Moscow (SVO),MMUN,UUEE,A359,13:45,,12/12/2025 3:00pm
SU158,Historic,Moscow (SVO),Cancun (CUN),UUEE,MMUN,A359,13:25,,12/12/2025 3:00pm
SU109,Historic,Miami (MIA),Moscow (SVO),KMIA,UUEE,A359,12:40,,12/12/2025 3:00pm
SU108,Historic,Moscow (SVO),Miami (MIA),UUEE,KMIA,A359,12:40,,12/12/2025 3:00pm
SU151,Historic,HaVana (HAV),Moscow (SVO),MUHA,UUEE,A359,12:35,,12/12/2025 3:00pm
SU296,AFL,Moscow (SVO),Denpasar (DPS),UUEE,WADD,A359,12:35,,12/31/2025 2:42pm
SU297,AFL,Moscow (SVO),Denpasar (DPS),UUEE,WADD,A359,12:25,,12/31/2025 2:58pm
SU156,Historic,Moscow (SVO),Punta Cana (PUJ),UUEE,MDPC,A359,12:15,,12/12/2025 3:00pm
SU154,Historic,Moscow (SVO),Varadero (VRA),UUEE,MUVR,A359,12:15,,12/12/2025 3:00pm
SU247,AFL,Mauritius (MRU),Moscow (SVO),FIMP,UUEE,B77W,11:05,,12/12/2025 3:00pm
SU107,Historic,Los Angeles (LAX),Moscow (SVO),KLAX,UUEE,B77W,11:00,,12/12/2025 3:00pm
SU106,Historic,Moscow (SVO),Los Angeles (LAX),UUEE,KLAX,B77W,11:00,,12/12/2025 3:00pm
SU155,Historic,Varadero (VRA),Moscow (SVO),MUVR,UUEE,A359,10:55,,12/12/2025 3:00pm
SU157,Historic,Punta Cana (PUJ),Moscow (SVO),MDPC,UUEE,A359,10:45,,12/12/2025 3:00pm
SU246,AFL,Moscow (SVO),Mauritius (MRU),UUEE,FIMP,B77W,10:40,,12/12/2025 3:00pm
SU629,Winter,Phuket (HKT),St. Petersburg (LED),VTSP,ULLI,A333,10:40,,12/12/2025 3:00pm
SU104,Historic,Moscow (SVO),Washington Dulles (IAD),UUEE,KIAD,A333,10:35,,12/12/2025 3:00pm
SU225,AFL,Sanya (SYX),Moscow (SVO),ZJSY,UUEE,A333,10:35,,12/12/2025 3:00pm
SU105,Historic,Washington Dulles (IAD),Moscow (SVO),KIAD,UUEE,A333,10:35,,12/12/2025 3:00pm
SU102,Historic,Moscow (SVO),New York (JFK),UUEE,KJFK,A333,10:30,,12/12/2025 3:00pm
SU103,Historic,New York (JFK),Moscow (SVO),KJFK,UUEE,A333,10:30,,12/12/2025 3:00pm
SU732,Winter,St. Petersburg (LED),Hurghada (HRG),ULLI,HEGN,A333,10:30,,12/12/2025 3:00pm
SU291,Historic,Hanoi (HAN),Moscow (SVO),VVNB,UUEE,B77W,10:20,,12/12/2025 3:00pm
SU277,Winter,Phuket (HKT),Moscow (SVO),VTSP,UUEE,B77W,10:20,,12/12/2025 3:00pm
SU293,AFL,Ho Chi Minh City (SGN),Moscow (SVO),VVTS,UUEE,A359,10:10,,12/12/2025 3:00pm
SU628,Winter,St. Petersburg (LED),Phuket (HKT),ULLI,VTSP,A333,10:00,,12/12/2025 3:00pm
SU221,AFL,Guangzhou (CAN),Moscow (SVO),ZGGG,UUEE,B77W,9:50,,12/12/2025 3:00pm
SU213,AFL,Hong Kong (HKG),Moscow (SVO),VHHH,UUEE,A333,9:50,,12/12/2025 3:00pm
SU292,AFL,Moscow (SVO),Ho Chi Minh City (SGN),UUEE,VVTS,A359,9:50,,12/12/2025 3:00pm
SU275,AFL,Phuket (HKT),Moscow (SVO),VTSP,UUEE,B77W,9:50,,12/12/2025 3:00pm
SU261,Historic,Tokyo Haneda (HND),Moscow (SVO),RJTT,UUEE,A333,9:45,,12/12/2025 3:00pm
SU271,Winter,Bangkok (BKK),Moscow (SVO),VTBS,UUEE,B77W,9:35,,12/12/2025 3:00pm
SU273,AFL,Bangkok (BKK),Moscow (SVO),VTSB,UUEE,B77W,9:35,,12/12/2025 3:00pm
SU212,AFL,Moscow (SVO),Hong Kong (HKG),UUEE,VHHH,A333,9:35,,12/12/2025 3:00pm
SU209,AFL,Shanghai (PVG),Moscow (SVO),ZSPD,UUEE,A333,9:30,,12/12/2025 3:00pm
SU251,Historic,Incheon (ICN),Moscow (SVO),RKSI,UUEE,B77W,9:25,,12/12/2025 3:00pm
SU260,Historic,Moscow (SVO),Tokyo Haneda (HND),UUEE,RJTT,A333,9:25,,12/12/2025 3:00pm
SU279,AFL,Phuket (HKT),Moscow (SVO),VTSP,UUEE,B77W,9:25,,12/12/2025 3:00pm
SU224,AFL,Moscow (SVO),Sanya (SYX),UUEE,ZJSY,A333,9:20,,12/12/2025 3:00pm
SU245,AFL,Victoria (SEZ),Moscow (SVO),FSIA,UUEE,A333,9:05,,12/12/2025 3:00pm
SU410,Summer,Moscow (SVO),Enfidha Hammamet (NBE),UUEE,DTNH,A333,8:55,,12/12/2025 3:00pm
SU278,AFL,Moscow (SVO),Phuket (HKT),UUEE,VTSP,B77W,8:45,,12/12/2025 3:00pm
SU274,AFL,Moscow (SVO),Phuket (HKT),UUEE,VTSP,B77W,8:40,,12/12/2025 3:00pm
SU653,AFL,Bangkok (BKK),Yekaterinburg (SVX),VTBS,USSS,A333,8:35,,12/12/2025 3:00pm
SU325,Winter,Male (MLE),Moscow (SVO),VRMM,UUEE,B77W,8:35,,12/12/2025 3:00pm
SU220,AFL,Moscow (SVO),Guangzhou (CAN),UUEE,ZGGG,B77W,8:35,,12/12/2025 3:00pm
SU290,Historic,Moscow (SVO),Hanoi (HAN),UUEE,VVNB,B77W,8:35,,12/12/2025 3:00pm
SU244,AFL,Moscow (SVO),Victoria (SEZ),UUEE,FSIA,A333,8:35,,12/12/2025 3:00pm
SU652,AFL,Yekaterinburg (SVX),Bangkok (BKK),USSS,VTBS,A333,8:35,,12/12/2025 3:00pm
SU276,Winter,Moscow (SVO),Phuket (HKT),UUEE,VTSP,B77W,8:30,,12/12/2025 3:00pm
SU1701,AFL,Vladivostok (VVO),Moscow (SVO),UHWW,UUEE,A359,8:30,,12/12/2025 3:00pm
SU1703,AFL,Vladivostok (VVO),Moscow (SVO),UHWW,UUEE,A359,8:30,,12/12/2025 3:00pm
SU1707,Summer,Vladivostok (VVO),Moscow (SVO),UHWW,UUEE,A333,8:30,,12/12/2025 3:00pm
SU1747,Summer,Yuzhno-Sakhalinsk (UUS),Moscow (SVO),UHSS,UUEE,A333,8:30,,12/12/2025 3:00pm
SU321,AFL,Male (MLE),Moscow (SVO),VRMM,UUEE,A359,8:25,,12/12/2025 3:00pm
SU270,Winter,Moscow (SVO),Bangkok (BKK),UUEE,VTBS,B77W,8:25,,12/12/2025 3:00pm
SU1737,Summer,Petropavlovsk-Kamchatsky (PKC),Moscow (SVO),UHPP,UUEE,B77W,8:25,,12/12/2025 3:00pm
SU1705,AFL,Vladivostok (VVO),Moscow (SVO),UHWW,UUEE,A359,8:25,,12/12/2025 3:00pm
SU1787,AFL,Yuzhno-Sakhalinsk (UUS),Moscow (SVO),UHSS,UUEE,A359,8:25,,12/12/2025 3:00pm
SU217,Historic,Chengdu Shuangliu (CTU),Moscow (SVO),ZUUU,UUEE,A333,8:20,,12/12/2025 3:00pm
SU1719,Summer,Khabarovsk (KHV),Moscow (SVO),UHHH,UUEE,A359,8:20,,12/12/2025 3:00pm
SU272,AFL,Moscow (SVO),Bangkok (BKK),UUEE,VTSB,B77W,8:20,,12/12/2025 3:00pm
SU1731,AFL,Petropavlovsk-Kamchatsky (PKC),Moscow (SVO),UHPP,UUEE,A359,8:20,,12/12/2025 3:00pm
SU1799,Winter,Vladivostok (VVO),Moscow (SVO),UHWW,UUEE,A359,8:20,,12/12/2025 3:00pm
SU1743,Summer,Yuzhno-Sakhalinsk (UUS),Moscow (SVO),UHSS,UUEE,A359,8:20,,12/12/2025 3:00pm
SU411,Summer,Enfidha Hammamet (NBE),Moscow (SVO),DTNH,UUEE,A333,8:10,,12/12/2025 3:00pm
SU1709,Summer,Vladivostok (VVO),Moscow (SVO),UHWW,UUEE,A333,8:10,,12/12/2025 3:00pm
SU1757,AFL,Vladivostok (VVO),Moscow (SVO),UHWW,UUEE,A359,8:10,,12/12/2025 3:00pm
SU320,AFL,Moscow (SVO),Male (MLE),UUEE,VRMM,A359,8:05,,12/12/2025 3:00pm
SU1746,Summer,Moscow (SVO),Yuzhno-Sakhalinsk (UUS),UUEE,UHSS,A333,8:05,,12/12/2025 3:00pm
SU1733,Summer,Petropavlovsk-Kamchatsky (PKC),Moscow (SVO),UHPP,UUEE,A359,8:05,,12/12/2025 3:00pm
SU1745,AFL,Yuzhno-Sakhalinsk (UUS),Moscow (SVO),UHSS,UUEE,B77W,8:05,,12/12/2025 3:00pm
SU205,AFL,Beijing (PKX),Moscow (SVO),ZBAD,UUEE,B77W,8:00,,12/12/2025 3:00pm
SU324,Winter,Moscow (SVO),Male (MLE),UUEE,VRMM,B77W,8:00,,12/12/2025 3:00pm
SU1735,AFL,Petropavlovsk-Kamchatsky (PKC),Moscow (SVO),UHPP,UUEE,A359,8:00,,12/12/2025 3:00pm
SU627,Winter,Phuket (HKT),Yekaterinburg (SVX),VTSP,USSS,A333,8:00,,12/12/2025 3:00pm
SU626,Winter,Yekaterinburg (SVX),Phuket (HKT),USSS,VTSP,A333,8:00,,12/12/2025 3:00pm
SU1713,AFL,Khabarovsk (KHV),Moscow (SVO),UHHH,UUEE,A359,7:50,,12/12/2025 3:00pm
SU250,Historic,Moscow (SVO),Incheon (ICN),UUEE,RKSI,B77W,7:50,,12/12/2025 3:00pm
SU1736,Summer,Moscow (SVO),Petropavlovsk-Kamchatsky (PKC),UUEE,UHPP,B77W,7:50,,12/12/2025 3:00pm
SU1734,AFL,Moscow (SVO),Petropavlovsk-Kamchatsky (PKC),UUEE,UHPP,A359,7:50,,12/12/2025 3:00pm
SU1730,AFL,Moscow (SVO),Petropavlovsk-Kamchatsky (PKC),UUEE,UHPP,A359,7:50,,12/12/2025 3:00pm
SU208,AFL,Moscow (SVO),Shanghai (PVG),UUEE,ZSPD,A333,7:50,,12/12/2025 3:00pm
SU2548,Historic,Moscow (SVO),Tenerife (TFS),UUEE,GCTS,A20N,7:50,,12/12/2025 3:00pm
SU2549,Historic,Tenerife (TFS),Moscow (SVO),GCTS,UUEE,A20N,7:50,,12/12/2025 3:00pm
SU1715,Summer,Khabarovsk (KHV),Moscow (SVO),UHHH,UUEE,A359,7:45,,12/12/2025 3:00pm
SU1711,AFL,Khabarovsk (KHV),Moscow (SVO),UHHH,UUEE,A333,7:45,,12/12/2025 3:00pm
SU1732,Summer,Moscow (SVO),Petropavlovsk-Kamchatsky (PKC),UUEE,UHPP,A359,7:45,,12/12/2025 3:00pm
SU1798,Winter,Moscow (SVO),Vladivostok (VVO),UUEE,UHWW,A359,7:45,,12/12/2025 3:00pm
SU1744,AFL,Moscow (SVO),Yuzhno-Sakhalinsk (UUS),UUEE,UHSS,B77W,7:45,,12/12/2025 3:00pm
SU1708,Summer,Moscow (SVO),Vladivostok (VVO),UUEE,UHWW,A333,7:40,,12/12/2025 3:00pm
SU1700,AFL,Moscow (SVO),Vladivostok (VVO),UUEE,UHWW,A359,7:40,,12/12/2025 3:00pm
SU1790,AFL,Moscow (SVO),Vladivostok (VVO),UUEE,UHWW,A359,7:35,,12/12/2025 3:00pm
SU657,Summer,Phuket (HKT),Khabarovsk (KHV),VTSP,UHHH,B77W,7:35,,12/12/2025 3:00pm
SU1702,AFL,Moscow (SVO),Vladivostok (VVO),UUEE,UHWW,A359,7:30,,12/12/2025 3:00pm
SU1704,AFL,Moscow (SVO),Vladivostok (VVO),UUEE,UHWW,A359,7:30,,12/12/2025 3:00pm
SU1786,AFL,Moscow (SVO),Yuzhno-Sakhalinsk (UUS),UUEE,UHSS,A359,7:30,,12/12/2025 3:00pm
SU237,AFL,Goa (GOI),Moscow (SVO),VOGO,UUEE,A333,7:25,,12/12/2025 3:00pm
SU1706,Summer,Moscow (SVO),Vladivostok (VVO),UUEE,UHWW,A333,7:25,,12/12/2025 3:00pm
SU656,Summer,Khabarovsk (KHV),Phuket (HKT),UHHH,VTSP,B77W,7:20,,12/12/2025 3:00pm
SU216,Historic,Moscow (SVO),Chengdu Shuangliu (CTU),UUEE,ZUUU,A333,7:20,,12/12/2025 3:00pm
SU1742,Summer,Moscow (SVO),Yuzhno-Sakhalinsk (UUS),UUEE,UHSS,A359,7:20,,12/12/2025 3:00pm
SU825,Summer,Phuket (HKT),Novosibirsk (OVB),VTSP,UHWW,B77W,7:20,,12/12/2025 3:00pm
SU637,AFL,Phuket (HKT),Novosibirsk (OVB),VTSP,UHWW,B77W,7:20,,12/12/2025 3:00pm
SU643,AFL,Khabarovsk (KHV),Phuket (HKT),UHHH,VTSP,B77W,7:10,,12/12/2025 3:00pm
SU636,AFL,Novosibirsk (OVB),Phuket (HKT),UNNT,VTSP,B77W,7:00,,12/12/2025 3:00pm
SU642,AFL,Phuket (HKT),Khabarovsk (KHV),VTSP,UHHH,B77W,7:00,,12/12/2025 3:00pm
SU647,AFL,Bangkok (BKK),Novosibirsk (OVB),VTBS,UNNT,A333,6:55,,12/12/2025 3:00pm
SU236,AFL,Moscow (SVO),Goa (GOI),UUEE,VOGO,A333,6:55,,12/12/2025 3:00pm
SU1712,AFL,Moscow (SVO),Khabarovsk (KHV),UUEE,UHHH,A359,6:55,,12/12/2025 3:00pm
SU1718,Summer,Moscow (SVO),Khabarovsk (KHV),UUEE,UHHH,A359,6:55,,12/12/2025 3:00pm
SU651,AFL,Bangkok (BKK),Novosibirsk (OVB),VTBS,UNNT,A333,6:50,,12/12/2025 3:00pm
SU824,Summer,Novosibirsk (OVB),Phuket (HKT),UNNT,VTSP,B77W,6:50,,12/12/2025 3:00pm
SU655,AFL,Bangkok (BKK),Khabarovsk (KHV),VTBS,UHHH,A333,6:45,,12/12/2025 3:00pm
SU634,AFL,Krasnoyarsk (KJA),Phuket (HKT),UNKL,VTSP,B77W,6:45,,12/12/2025 3:00pm
SU1710,AFL,Moscow (SVO),Khabarovsk (KHV),UUEE,UHHH,A333,6:45,,12/12/2025 3:00pm
SU1714,Summer,Moscow (SVO),Khabarovsk (KHV),UUEE,UHHH,A359,6:45,,12/12/2025 3:00pm
SU635,AFL,Phuket (HKT),Krasnoyarsk (KJA),VTSP,UNKL,B77W,6:45,,12/12/2025 3:00pm
SU720,Historic,St. Petersburg (LED),Tashkent (TAS),ULLI,UTTT,A320,6:45,,12/12/2025 3:00pm
SU331,Historic,Ulaanbaatar (UBN),Moscow (SVO),ZMCK,UUEE,B738,6:45,,12/12/2025 3:00pm
SU638,AFL,Vladivostok (VVO),Phuket (HKT),UHWW,VTSP,B77W,6:45,,12/12/2025 3:00pm
SU1751,AFL,Yakutsk (YKS),Moscow (SVO),UEEE,UUEE,B738,6:45,,12/12/2025 3:00pm
SU654,AFL,Khabarovsk (KHV),Bangkok (BKK),UHHH,VTBS,A333,6:40,,12/12/2025 3:00pm
SU815,AFL,Bangkok (BKK),Krasnoyarsk (KJA),VTBS,UNKL,A333,6:35,,12/12/2025 3:00pm
SU204,AFL,Moscow (SVO),Beijing (PKX),UUEE,ZBAD,B77W,6:35,,12/12/2025 3:00pm
SU660,AFL,Irkutsk (IKT),Phuket (HKT),UIII,VTSP,A321,6:30,,12/12/2025 3:00pm
SU650,AFL,Novosibirsk (OVB),Bangkok (BKK),UNNT,VTBS,A333,6:30,,12/12/2025 3:00pm
SU646,AFL,Novosibirsk (OVB),Bangkok (BKK),UNNT,VTBS,A333,6:30,,12/12/2025 3:00pm
SU661,AFL,Phuket (HKT),Irkutsk (IKT),VTSP,UIII,A321,6:30,,12/12/2025 3:00pm
SU639,AFL,Phuket (HKT),Vladivostok (VVO),VTSP,UHWW,B77W,6:30,,12/12/2025 3:00pm
SU644,AFL,Vladivostok (VVO),Bangkok (BKK),UHWW,VTBS,B738,6:25,,12/12/2025 3:00pm
SU233,AFL,Delhi (DEL),Moscow (SVO),VIDP,UUEE,A333,6:20,,12/12/2025 3:00pm
SU814,AFL,Krasnoyarsk (KJA),Bangkok (BKK),UNKL,VTBS,A333,6:20,,12/12/2025 3:00pm
SU802,Summer,Novosibirsk (OVB),Antalya (AYT),UNNT,LTAI,B738,6:20,,12/12/2025 3:00pm
SU734,Winter,St. Petersburg (LED),Sharm el-Sheikh (SSH),ULLI,HESH,A333,6:20,,12/12/2025 3:00pm
SU733,Winter,Hurghada (HRG),St. Petersburg (LED),HEGN,ULLI,A333,6:15,,12/12/2025 3:00pm
SU1753,AFL,Yakutsk (YKS),Moscow (SVO),UEEE,UUEE,B738,6:15,,12/12/2025 3:00pm
SU633,AFL,Goa (GOI),Yekaterinburg (SVX),VOGO,USSS,B738,6:10,,12/12/2025 3:00pm
SU500,Historic,Moscow (SVO),Tel Aviv (TLV),UUEE,LLBG,A321,6:10,,12/12/2025 3:00pm
SU501,Historic,Tel Aviv (TLV),Moscow (SVO),LLBG,UUEE,A321,6:10,,12/12/2025 3:00pm
SU632,AFL,Yekaterinburg (SVX),Goa (GOI),USSS,VOGO,B738,6:10,,12/12/2025 3:00pm
SU1441,Summer,Irkutsk (IKT),Moscow (SVO),UIII,UUEE,B738,6:05,,12/12/2025 3:00pm
SU1445,AFL,Irkutsk (IKT),Moscow (SVO),UIII,UUEE,B738,6:05,,12/12/2025 3:00pm
SU1750,AFL,Moscow (SVO),Yakutsk (YKS),UUEE,UEEE,B738,6:05,,12/12/2025 3:00pm
SU1752,AFL,Moscow (SVO),Yakutsk (YKS),UUEE,UEEE,B738,6:05,,12/12/2025 3:00pm
SU1447,AFL,Irkutsk (IKT),Moscow (SVO),UIII,UUEE,B738,6:00,,12/12/2025 3:00pm
SU1443,AFL,Irkutsk (IKT),Moscow (SVO),UIII,UUEE,B738,6:00,,12/12/2025 3:00pm
SU1563,AFL,Irkutsk (IKT),Moscow (SVO),UIII,UUEE,B738,6:00,,12/12/2025 3:00pm
SU429,Winter,Sharm el-Sheikh (SSH),Moscow (SVO),HESH,UUEE,B738,6:00,,12/12/2025 3:00pm
SU659,AFL,Bangkok (BKK),Irkutsk (IKT),VTSP,UIII,B738,5:55,,12/12/2025 3:00pm
SU425,Winter,Hurghada (HRG),Moscow (SVO),HEGN,UUEE,B738,5:55,,12/12/2025 3:00pm
SU1565,Winter,Irkutsk (IKT),Moscow (SVO),UIII,UUEE,B738,5:55,,12/12/2025 3:00pm
SU510,Historic,Moscow (SVO),Beirut (BEY),UUEE,OLBA,A20N,5:55,,12/12/2025 3:00pm
SU424,Winter,Moscow (SVO),Hurghada (HRG),UUEE,HEGN,B738,5:55,,12/12/2025 3:00pm
SU645,AFL,Bangkok (BKK),Vladivostok (VVO),VTBS,UHWW,B738,5:50,,12/12/2025 3:00pm
SU523,Summer,Dubai (DWC),Moscow (SVO),OMDW,UUEE,B738,5:50,,12/12/2025 3:00pm
SU658,AFL,Irkutsk (IKT),Bangkok (BKK),UIII,VTSP,B738,5:50,,12/12/2025 3:00pm
SU2896,Historic,Krasnoyarsk (KJA),Sochi (AER),UNKL,URSS,B738,5:50,,12/12/2025 3:00pm
SU428,Winter,Moscow (SVO),Sharm el-Sheikh (SSH),UUEE,HESH,B738,5:50,,12/12/2025 3:00pm
SU2897,Historic,Sochi (AER),Krasnoyarsk (KJA),URSS,UNKL,B738,5:50,,12/12/2025 3:00pm
SU531,Winter,Abu Dhabi (AUH),Moscow (SVO),OMAA,UUEE,B738,5:45,,12/12/2025 3:00pm
SU701,Historic,Issyk-Kul (IKU),St. Petersburg (LED),UCFL,ULLI,A320,5:45,,12/12/2025 3:00pm
SU2607,Historic,Lisbon (LIS),Moscow (SVO),LPPT,UUEE,B738,5:45,,12/12/2025 3:00pm
SU2501,Historic,Madrid (MAD),Moscow (SVO),LEMD,UUEE,A20N,5:45,,12/12/2025 3:00pm
SU2500,Historic,Moscow (SVO),Madrid (MAD),UUEE,LEMD,A20N,5:45,,12/12/2025 3:00pm
SU528,Historic,Moscow (SVO),Sharjah (SHJ),UUEE,OMSJ,B738,5:45,,12/12/2025 3:00pm
SU426,AFL,Moscow (SVO),Sharm el-Sheikh (SSH),UUEE,HESH,A333,5:45,,12/12/2025 3:00pm
SU330,Historic,Moscow (SVO),Ulaanbaatar (UBN),UUEE,ZMCK,B738,5:45,,12/12/2025 3:00pm
SU529,Historic,Sharjah (SHJ),Moscow (SVO),OMSJ,UUEE,B738,5:45,,12/12/2025 3:00pm
SU422,AFL,Moscow (SVO),Hurghada (HRG),UUEE,HEGN,A333,5:40,,12/12/2025 3:00pm
SU807,Summer,Novosibirsk (OVB),Antalya (AYT),UNNT,LTAI,B738,5:40,,12/12/2025 3:00pm
SU427,AFL,Sharm el-Sheikh (SSH),Moscow (SVO),HESH,UUEE,A333,5:40,,12/12/2025 3:00pm
SU2521,Historic,Malaga (AGP),Moscow (SVO),LEMG,UUEE,B738,5:35,,12/12/2025 3:00pm
SU2520,Historic,Moscow (SVO),Malaga (AGP),UUEE,LEMG,B738,5:35,,12/12/2025 3:00pm
SU603,Historic,Namangan (NMA),St. Petersburg (LED),UTFN,ULLI,A320,5:35,,12/12/2025 3:00pm
SU602,Historic,St. Petersburg (LED),Namangan (NMA),ULLI,UTFN,A320,5:35,,12/12/2025 3:00pm
SU401,AFL,Cairo (CAI),Moscow (SVO),HECA,UUEE,B738,5:30,,12/12/2025 3:00pm
SU400,AFL,Moscow (SVO),Cairo (CAI),UUEE,HECA,B738,5:30,,12/12/2025 3:00pm
SU2076,Historic,Moscow (SVO),Paphos (PFO),UUEE,LCPH,B738,5:30,,12/12/2025 3:00pm
SU2502,Historic,Moscow (SVO),Valencia (VLC),UUEE,LEVC,A20N,5:30,,12/12/2025 3:00pm
SU2077,Historic,Paphos (PFO),Moscow (SVO),LCPH,UUEE,B738,5:30,,12/12/2025 3:00pm
SU2503,Historic,Valencia (VLC),Moscow (SVO),LEVC,UUEE,A20N,5:30,,12/12/2025 3:00pm
SU791,Summer,Antalya (AYT),St. Petersburg (LED),LTAI,ULLI,B738,5:25,,12/12/2025 3:00pm
SU527,Winter,Dubai (DXB),Moscow (SVO),OMDB,UUEE,A333,5:25,,12/12/2025 3:00pm
SU232,AFL,Moscow (SVO),Delhi (DEL),UUEE,VIDP,A333,5:25,,12/12/2025 3:00pm
SU790,Summer,St. Petersburg (LED),Antalya (AYT),ULLI,LTAI,B738,5:25,,12/12/2025 3:00pm
SU700,Historic,St. Petersburg (LED),Issyk-Kul (IKU),ULLI,UCFL,A320,5:25,,12/12/2025 3:00pm
SU803,Summer,Antalya (AYT),Novosibirsk (OVB),LTAI,UNNT,B738,5:20,,12/12/2025 3:00pm
SU525,AFL,Dubai (DXB),Moscow (SVO),OMDB,UUEE,B738,5:20,,12/12/2025 3:00pm
SU416,Historic,Moscow (SVO),Casablanca (CMN),UUEE,GMMN,A20N,5:20,,12/12/2025 3:00pm
SU722,Summer,St. Petersburg (LED),Istanbul (IST),ULLI,LTFM,B738,5:20,,12/12/2025 3:00pm
SU521,AFL,Dubai (DXB),Moscow (SVO),OMDB,UUEE,A333,5:15,,12/12/2025 3:00pm
SU2849,Historic,Krasnodar (KRR),Krasnoyarsk (KJA),URKK,UNKL,B738,5:15,,12/12/2025 3:00pm
SU2848,Historic,Krasnoyarsk (KJA),Krasnodar (KRR),UNKL,URKK,B738,5:15,,12/12/2025 3:00pm
SU788,Summer,St. Petersburg (LED),Antalya (AYT),ULLI,LTAI,B738,5:15,,12/12/2025 3:00pm
SU2850,Historic,St. Petersburg (LED),Paphos (PFO),ULLI,LCPH,A320,5:15,,12/12/2025 3:00pm
SU1442,AFL,Moscow (SVO),Irkutsk (IKT),UUEE,UIII,B738,5:10,,12/12/2025 3:00pm
SU1562,AFL,Moscow (SVO),Irkutsk (IKT),UUEE,UIII,B738,5:10,,12/12/2025 3:00pm
SU2946,Historic,Novosibirsk (OVB),Simferopol (SIP),UNNT,URFF,A320,5:10,,12/12/2025 3:00pm
SU842,Historic,Novosibirsk (OVB),Yerevan (EVN),UNNT,UDYZ,B738,5:10,,12/12/2025 3:00pm
SU2947,Historic,Simferopol (SIP),Novosibirsk (OVB),URFF,UNNT,A320,5:10,,12/12/2025 3:00pm
SU721,Historic,Tashkent (TAS),St. Petersburg (LED),UTTT,ULLI,A320,5:10,,12/12/2025 3:00pm
SU843,Historic,Yerevan (EVN),Novosibirsk (OVB),UDYZ,UNNT,B738,5:10,,12/12/2025 3:00pm
SU1941,AFL,Almaty (ALA),Moscow (SVO),UAAA,UUEE,A320,5:05,,12/12/2025 3:00pm
SU1971,AFL,Fergana (FEG),Moscow (SVO),UTFF,UUEE,B738,5:05,,12/12/2025 3:00pm
SU723,Summer,Istanbul (IST),St. Petersburg (LED),LTFM,ULLI,B738,5:05,,12/12/2025 3:00pm
SU530,Winter,Moscow (SVO),Abu Dhabi (AUH),UUEE,OMAA,B738,5:05,,12/12/2025 3:00pm
SU1444,AFL,Moscow (SVO),Irkutsk (IKT),UUEE,UIII,B738,5:05,,12/12/2025 3:00pm
SU1564,Winter,Moscow (SVO),Irkutsk (IKT),UUEE,UIII,B738,5:05,,12/12/2025 3:00pm
SU2172,Summer,Moscow (SVO),Istanbul (IST),UUEE,LTFM,A320,5:05,,12/12/2025 3:00pm
SU2606,Historic,Moscow (SVO),Lisbon (LIS),UUEE,LPPT,B738,5:05,,12/12/2025 3:00pm
SU417,Historic,Casablanca (CMN),Moscow (SVO),GMMN,UUEE,A20N,5:00,,12/12/2025 3:00pm
SU522,Summer,Moscow (SVO),Dubai (DWC),UUEE,OMDW,B738,5:00,,12/12/2025 3:00pm
SU524,AFL,Moscow (SVO),Dubai (DXB),UUEE,OMDB,B738,5:00,,12/12/2025 3:00pm
SU1440,Summer,Moscow (SVO),Irkutsk (IKT),UUEE,UIII,B738,5:00,,12/12/2025 3:00pm
SU1479,AFL,Abakan (ABA),Moscow (SVO),UNAA,UUEE,A320,4:55,,12/12/2025 3:00pm
SU1489,Winter,Krasnoyarsk (KJA),Moscow (SVO),UNKL,UUEE,A320,4:55,,12/12/2025 3:00pm
SU2120,Summer,Moscow (SVO),Bodrum (BJV),UUEE,LTFE,B738,4:55,,12/12/2025 3:00pm
SU2122,AFL,Moscow (SVO),Dalaman (DLM),UUEE,LTBS,A20N,4:55,,12/12/2025 3:00pm
SU526,Winter,Moscow (SVO),Dubai (DXB),UUEE,OMDB,A333,4:55,,12/12/2025 3:00pm
SU1446,AFL,Moscow (SVO),Irkutsk (IKT),UUEE,UIII,B738,4:55,,12/12/2025 3:00pm
SU520,AFL,Moscow (SVO),Dubai (DXB),UUEE,OMDB,A333,4:50,,12/12/2025 3:00pm
SU1473,AFL,Krasnoyarsk (KJA),Moscow (SVO),UNKL,UUEE,A320,4:50,,12/12/2025 3:00pm
SU1475,AFL,Krasnoyarsk (KJA),Moscow (SVO),UNKL,UUEE,A320,4:50,,12/12/2025 3:00pm
SU423,AFL,Hurghada (HRG),Moscow (SVO),HEGN,UUEE,A333,4:50,,12/12/2025 3:00pm
SU2121,Summer,Bodrum (BJV),Moscow (SVO),LTFE,UUEE,B738,4:45,,12/12/2025 3:00pm
SU2123,AFL,Dalaman (DLM),Moscow (SVO),LTBS,UUEE,A20N,4:45,,12/12/2025 3:00pm
SU1487,AFL,Krasnoyarsk (KJA),Moscow (SVO),UNKL,UUEE,A321,4:45,,12/12/2025 3:00pm
SU1477,Summer,Krasnoyarsk (KJA),Moscow (SVO),UNKL,UUEE,A320,4:45,,12/12/2025 3:00pm
SU1940,AFL,Moscow (SVO),Almaty (ALA),UUEE,UAAA,A320,4:40,,12/12/2025 3:00pm
SU1970,AFL,Moscow (SVO),Fergana (FEG),UUEE,UTFF,B738,4:40,,12/12/2025 3:00pm
SU1478,AFL,Moscow (SVO),Abakan (ABA),UUEE,UNAA,A320,4:40,,12/12/2025 3:00pm
SU2146,Summer,Moscow (SVO),Antalya (AYT),UUEE,LTAI,A321,4:40,,12/12/2025 3:00pm
SU1471,AFL,Krasnoyarsk (KJA),Moscow (SVO),UNKL,UUEE,A320,4:35,,12/12/2025 3:00pm
SU1485,AFL,Krasnoyarsk (KJA),Moscow (SVO),UNKL,UUEE,A321,4:35,,12/12/2025 3:00pm
SU2147,Summer,Antalya (AYT),Moscow (SVO),LTAI,UUEE,A321,4:30,,12/12/2025 3:00pm
SU1927,AFL,Bishkek (FRU),Moscow (SVO),UCFM,UUEE,A320,4:30,,12/12/2025 3:00pm
SU1488,Winter,Moscow (SVO),Krasnoyarsk (KJA),UUEE,UNKL,A320,4:30,,12/12/2025 3:00pm
SU1472,AFL,Moscow (SVO),Krasnoyarsk (KJA),UUEE,UNKL,A320,4:30,,12/12/2025 3:00pm
SU1911,AFL,Tashkent (TAS),Moscow (SVO),UTTT,UUEE,A320,4:30,,12/12/2025 3:00pm
SU2174,AFL,Istanbul (IST),Moscow (SVO),LTFM,UUEE,A320,4:25,,12/12/2025 3:00pm
SU1486,AFL,Moscow (SVO),Krasnoyarsk (KJA),UUEE,UNKL,A321,4:25,,12/12/2025 3:00pm
SU1476,Summer,Moscow (SVO),Krasnoyarsk (KJA),UUEE,UNKL,A320,4:25,,12/12/2025 3:00pm
SU1474,AFL,Moscow (SVO),Krasnoyarsk (KJA),UUEE,UNKL,A320,4:25,,12/12/2025 3:00pm
SU1470,AFL,Moscow (SVO),Krasnoyarsk (KJA),UUEE,UNKL,A320,4:25,,12/12/2025 3:00pm
SU2175,AFL,Moscow (SVO),Istanbul (IST),UUEE,LTFM,A320,4:20,,12/12/2025 3:00pm
SU1926,AFL,Moscow (SVO),Bishkek (FRU),UUEE,UCFM,A320,4:20,,12/12/2025 3:00pm
SU1910,AFL,Moscow (SVO),Tashkent (TAS),UUEE,UTTT,A320,4:20,,12/12/2025 3:00pm
SU2173,Summer,Istanbul (IST),Moscow (SVO),LTFM,UUEE,A320,4:15,,12/12/2025 3:00pm
SU1419,AFL,Novosibirsk (OVB),Moscow (SVO),UNNT,UUEE,A320,4:10,,12/12/2025 3:00pm
SU1421,AFL,Novosibirsk (OVB),Moscow (SVO),UNNT,UUEE,A320,4:10,,12/12/2025 3:00pm
SU1423,AFL,Novosibirsk (OVB),Moscow (SVO),UNNT,UUEE,A320,4:10,,12/12/2025 3:00pm
SU1425,AFL,Novosibirsk (OVB),Moscow (SVO),UNNT,UUEE,A320,4:10,,12/12/2025 3:00pm
SU1427,AFL,Novosibirsk (OVB),Moscow (SVO),UNNT,UUEE,A320,4:10,,12/12/2025 3:00pm
SU1955,AFL,Dushanbe (DYU),Moscow (SVO),UTDD,UUEE,A320,4:05,,12/12/2025 3:00pm
SU1961,AFL,Samarkand (SKD),Moscow (SVO),UTSS,UUEE,A320,4:05,,12/12/2025 3:00pm
SU831,AFL,Yekaterinburg (SVX),Antalya (AYT),USSS,LTAI,A320,4:05,,12/12/2025 3:00pm
SU1418,AFL,Moscow (SVO),Novosibirsk (OVB),UUEE,UNNT,A320,4:00,,12/12/2025 3:00pm
SU1426,AFL,Moscow (SVO),Novosibirsk (OVB),UUEE,UNNT,A320,4:00,,12/12/2025 3:00pm
SU1424,AFL,Moscow (SVO),Novosibirsk (OVB),UUEE,UNNT,A320,4:00,,12/12/2025 3:00pm
SU1422,AFL,Moscow (SVO),Novosibirsk (OVB),UUEE,UNNT,A320,4:00,,12/12/2025 3:00pm
SU1420,AFL,Moscow (SVO),Novosibirsk (OVB),UUEE,UNNT,A320,4:00,,12/12/2025 3:00pm
SU830,AFL,Antalya (AYT),Yekaterinburg (SVX),LTAI,USSS,A320,3:55,,12/12/2025 3:00pm
SU1954,AFL,Moscow (SVO),Dushanbe (DYU),UUEE,UTDD,A320,3:50,,12/12/2025 3:00pm
SU1960,AFL,Moscow (SVO),Samarkand (SKD),UUEE,UTSS,A320,3:50,,12/12/2025 3:00pm
SU1401,AFL,Omsk (OMS),Moscow (SVO),UNOO,UUEE,A320,3:45,,12/12/2025 3:00pm
SU1403,AFL,Omsk (OMS),Moscow (SVO),UNOO,UUEE,A320,3:45,,12/12/2025 3:00pm
SU1389,AFL,Yekaterinburg (SVX),Moscow (SVO),USSS,UUEE,A320,3:20,,12/12/2025 3:00pm
SU1391,AFL,Yekaterinburg (SVX),Moscow (SVO),USSS,UUEE,A320,3:20,,12/12/2025 3:00pm
SU1393,AFL,Yekaterinburg (SVX),Moscow (SVO),USSS,UUEE,A320,3:20,,12/12/2025 3:00pm
SU1395,AFL,Yekaterinburg (SVX),Moscow (SVO),USSS,UUEE,A320,3:20,,12/12/2025 3:00pm
SU1397,AFL,Yekaterinburg (SVX),Moscow (SVO),USSS,UUEE,A320,3:20,,12/12/2025 3:00pm
SU1400,AFL,Moscow (SVO),Omsk (OMS),UUEE,UNOO,A320,3:15,,12/12/2025 3:00pm
SU1402,AFL,Moscow (SVO),Omsk (OMS),UUEE,UNOO,A320,3:15,,12/12/2025 3:00pm
SU1388,AFL,Moscow (SVO),Yekaterinburg (SVX),UUEE,USSS,A320,3:05,,12/12/2025 3:00pm
SU1390,AFL,Moscow (SVO),Yekaterinburg (SVX),UUEE,USSS,A320,3:05,,12/12/2025 3:00pm
SU1392,AFL,Moscow (SVO),Yekaterinburg (SVX),UUEE,USSS,A320,3:05,,12/12/2025 3:00pm
SU1394,AFL,Moscow (SVO),Yekaterinburg (SVX),UUEE,USSS,A320,3:05,,12/12/2025 3:00pm
SU1396,AFL,Moscow (SVO),Yekaterinburg (SVX),UUEE,USSS,A320,3:05,,12/12/2025 3:00pm
SU6051,AFL,St. Petersburg (LED),Moscow (SVO),ULLI,UUEE,A320,1:35,,12/12/2025 3:00pm
SU6053,AFL,St. Petersburg (LED),Moscow (SVO),ULLI,UUEE,A320,1:35,,12/12/2025 3:00pm
SU6055,AFL,St. Petersburg (LED),Moscow (SVO),ULLI,UUEE,A320,1:35,,12/12/2025 3:00pm
SU6057,AFL,St. Petersburg (LED),Moscow (SVO),ULLI,UUEE,A320,1:35,,12/12/2025 3:00pm
SU6059,AFL,St. Petersburg (LED),Moscow (SVO),ULLI,UUEE,A320,1:35,,12/12/2025 3:00pm
SU6061,AFL,St. Petersburg (LED),Moscow (SVO),ULLI,UUEE,A320,1:35,,12/12/2025 3:00pm
SU6063,AFL,St. Petersburg (LED),Moscow (SVO),ULLI,UUEE,A320,1:35,,12/12/2025 3:00pm
SU6065,AFL,St. Petersburg (LED),Moscow (SVO),ULLI,UUEE,A320,1:35,,12/12/2025 3:00pm
SU6067,AFL,St. Petersburg (LED),Moscow (SVO),ULLI,UUEE,A320,1:35,,12/12/2025 3:00pm
SU6069,AFL,St. Petersburg (LED),Moscow (SVO),ULLI,UUEE,A320,1:35,,12/12/2025 3:00pm
SU6071,AFL,St. Petersburg (LED),Moscow (SVO),ULLI,UUEE,A320,1:35,,12/12/2025 3:00pm
SU6073,AFL,St. Petersburg (LED),Moscow (SVO),ULLI,UUEE,A320,1:35,,12/12/2025 3:00pm
SU6075,AFL,St. Petersburg (LED),Moscow (SVO),ULLI,UUEE,A320,1:35,,12/12/2025 3:00pm
SU6050,AFL,Moscow (SVO),St. Petersburg (LED),UUEE,ULLI,A320,1:30,,12/12/2025 3:00pm
SU6052,AFL,Moscow (SVO),St. Petersburg (LED),UUEE,ULLI,A320,1:30,,12/12/2025 3:00pm
SU6054,AFL,Moscow (SVO),St. Petersburg (LED),UUEE,ULLI,A320,1:30,,12/12/2025 3:00pm
SU6056,AFL,Moscow (SVO),St. Petersburg (LED),UUEE,ULLI,A320,1:30,,12/12/2025 3:00pm
SU6058,AFL,Moscow (SVO),St. Petersburg (LED),UUEE,ULLI,A320,1:30,,12/12/2025 3:00pm
SU6060,AFL,Moscow (SVO),St. Petersburg (LED),UUEE,ULLI,A320,1:30,,12/12/2025 3:00pm
SU6062,AFL,Moscow (SVO),St. Petersburg (LED),UUEE,ULLI,A320,1:30,,12/12/2025 3:00pm
SU6064,AFL,Moscow (SVO),St. Petersburg (LED),UUEE,ULLI,A320,1:30,,12/12/2025 3:00pm
SU6066,AFL,Moscow (SVO),St. Petersburg (LED),UUEE,ULLI,A320,1:30,,12/12/2025 3:00pm
SU6068,AFL,Moscow (SVO),St. Petersburg (LED),UUEE,ULLI,A320,1:30,,12/12/2025 3:00pm
SU6070,AFL,Moscow (SVO),St. Petersburg (LED),UUEE,ULLI,A320,1:30,,12/12/2025 3:00pm
SU6072,AFL,Moscow (SVO),St. Petersburg (LED),UUEE,ULLI,A320,1:30,,12/12/2025 3:00pm
SU6074,AFL,Moscow (SVO),St. Petersburg (LED),UUEE,ULLI,A320,1:30,,12/12/2025 3:00pm`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authed = createAuthedClient(req);
    const { data: userData, error: userErr } = await authed.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) return json({ error: "Forbidden" }, { status: 403 });

    const rows = parseCsv(CSV_DATA);
    if (rows.length < 2) return json({ error: "CSV is empty" }, { status: 400 });

    const header = rows[0].map(normalizeHeader);

    const idxFlight = header.indexOf("flight number");
    const idxCode = header.indexOf("code");
    const idxDepCity = header.indexOf("departure city");
    const idxArrCity = header.indexOf("arrival city");
    const idxDepIcao = header.indexOf("dep. icao");
    const idxArrIcao = header.indexOf("arr icao");
    const idxAircraft = header.indexOf("aircraft");
    const idxDuration = header.indexOf("duration");
    const idxRemarks = header.indexOf("remarks");
    const idxLmt = header.indexOf("lmt");

    if (idxFlight < 0 || idxDepIcao < 0 || idxArrIcao < 0) {
      return json({ error: "CSV headers not recognized" }, { status: 400 });
    }

    const payload = rows.slice(1).map((r) => {
      const durationRaw = idxDuration >= 0 ? pick(r, idxDuration) : "";
      const durationMins = parseDurationToMinutes(durationRaw);

      const lmtRaw = idxLmt >= 0 ? pick(r, idxLmt) : "";
      const lmt = lmtRaw ? new Date(lmtRaw).toISOString() : null;

      return {
        flight_number: pick(r, idxFlight),
        code: idxCode >= 0 ? pick(r, idxCode) : null,
        dep_city: idxDepCity >= 0 ? pick(r, idxDepCity) : null,
        arr_city: idxArrCity >= 0 ? pick(r, idxArrCity) : null,
        dep_icao: pick(r, idxDepIcao).toUpperCase(),
        arr_icao: pick(r, idxArrIcao).toUpperCase(),
        aircraft: idxAircraft >= 0 ? pick(r, idxAircraft) : null,
        duration_raw: durationRaw || null,
        duration_mins: durationMins,
        remarks: idxRemarks >= 0 ? pick(r, idxRemarks) : null,
        lmt: lmt && lmt !== "Invalid Date" ? lmt : null,
      };
    }).filter((x) => x.flight_number && x.dep_icao && x.arr_icao);

    // Clear existing routes first
    await admin.from("route_catalog").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // Batch upserts
    let imported = 0;
    const batchSize = 500;
    for (let i = 0; i < payload.length; i += batchSize) {
      const batch = payload.slice(i, i + batchSize);
      const { error } = await admin.from("route_catalog").upsert(batch, {
        onConflict: "flight_number,dep_icao,arr_icao",
      });
      if (error) throw error;
      imported += batch.length;
    }

    return json({ imported });
  } catch (e: any) {
    return json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
});
