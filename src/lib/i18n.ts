import { prisma } from "@/lib/prisma";

export type Locale = "he" | "ar";

export function normalizeLocale(value: string | null | undefined): Locale {
  return value === "ar" ? "ar" : "he";
}

type Vars = Record<string, string | number>;

const he = {
  brand: "ספר בקליק",
  admin: "מנהל",
  bookTitle: "קביעת תור",
  pickDateTime: "בחרו תאריך ושעה פנויה",
  pickStaff: "בחרו ספר",
  staffAnyone: "כל מי שפנוי",
  date: "תאריך",
  time: "שעה",
  loadingSlots: "טוען משבצות...",
  noSlots: "אין משבצות פנויות בתאריך זה",
  fullName: "שם מלא",
  phone: "טלפון",
  phoneOptional: "טלפון (אופציונלי — בלי טלפון לא יישלח SMS)",
  bookCta: "קביעת תור",
  bookingSaving: "שומר תור...",
  bookFailed: "לא ניתן לקבוע תור",
  networkError: "שגיאת רשת",
  bookSuccess: "התור נקבע ל-{date} בשעה {time}. נתראה!",
  bookSuccessSms: " נשלח SMS לטלפון.",
  bookSuccessSmsFail: "התור נקבע, אבל SMS לא נשלח: {error}",

  loginTitle: "כניסת מנהל",
  loginSubtitle: "ניהול היומן של {name}",
  username: "שם משתמש",
  password: "סיסמה",
  loginCta: "התחברות",
  loggingIn: "מתחבר...",
  loginFailed: "ההתחברות נכשלה",

  adminEyebrow: "ספר בקליק · ניהול",
  autoRefresh: "מתרענן אוטומטית כל דקה",
  publicCalendar: "ליומן הציבורי",
  logout: "יציאה",
  tabAppointments: "תורים",
  tabHours: "שעות פעילות",
  tabDaysOff: "ימי חופש",
  tabSms: "הודעות SMS",
  loading: "טוען...",
  loadError: "שגיאה בטעינת הנתונים",
  noAppointments: "אין תורים קרובים",
  today: "היום",
  nowInShop: "עכשיו במספרה",
  nextUp: "הבא בתור",
  cancelAppointment: "ביטול תור",
  confirmCancel: "לבטל את התור?",
  cancelFailed: "ביטול נכשל",
  cancelled: "התור בוטל",
  active: "פעיל",
  saveHours: "שמירת שעות",
  hoursSaved: "שעות הפעילות עודכנו",
  saveFailed: "שמירה נכשלה",
  noteOptional: "הערה (אופציונלי)",
  add: "הוספה",
  remove: "הסרה",
  addFailed: "הוספה נכשלה",
  dayOffAdded: "יום חופש נוסף",
  dayOffRemoved: "יום החופש הוסר",
  noDaysOff: "אין ימי חופש קרובים",
  smsHelp:
    "הלקוח מקבל SMS באישור התור, ותזכורת לפני התור. ניתן לכבות או לשנות את זמן התזכורת.",
  smsConfirmToggle: "שליחת SMS באישור קביעת תור",
  smsReminderToggle: "שליחת SMS תזכורת לפני התור",
  reminderMinutes: "דקות לפני התור לתזכורת",
  reminderHint: "ברירת מחדל: 30 דקות (מינימום 5)",
  saveSettings: "שמירת הגדרות",
  smsSaved: "הגדרות ההודעות נשמרו",
  smsSaveFailed: "שמירת הגדרות SMS נכשלה",
  smsServiceTitle: "שירות הודעות SMS",
  smsUpgrade:
    "כדי לקבל שירות הודעות SMS יש לשדרג את המנוי. נא לפנות למנהל האתר {name} {phone}.",
  contactAdmin: "צור קשר עם {name}",

  cancelMeta: "ביטול תור",
  cancelHeading: "ביטול תור",
  cancelQuestion: "לבטל את התור?",
  cancelCta: "ביטול התור",
  cancelling: "מבטל…",
  keepAppointment: "לא, תודה — השארת התור",
  cancelSuccessTitle: "התור בוטל",
  cancelSuccessBody:
    "התור אצל {name} בוטל בהצלחה. השעה חזרה להיות פנויה.",
  bookAgain: "לקביעת תור חדש",
  alreadyCancelledTitle: "התור כבר בוטל",
  alreadyCancelledBody: "התור הזה כבר בוטל בעבר. אין צורך לעשות דבר נוסף.",
  cannotCancelTitle: "לא ניתן לבטל",
  cannotCancelBody:
    "לא ניתן לבטל את התור הזה (אולי כבר עבר או שאינו פעיל). לשאלות — פנו ישירות לספר.",
  invalidLinkTitle: "הקישור לא תקין",
  invalidLinkBody:
    "לא מצאנו תור לקישור הזה. אם עדיין צריך לבטל — פנו לספר ישירות.",
  incompleteLinkTitle: "קישור הביטול לא שלם",
  incompleteLinkBody:
    "נפתח קישור בלי מזהה תור. נסו לפתוח שוב את הקישור המלא מההודעה (לחיצה ארוכה על הכתובת והעתקה), או פנו לספר לביטול.",
  backHome: "חזרה לספר בקליק",
  appointmentAt: "התור אצל",
  atTime: "בשעה",

  smsCancelLabel: "ביטול:",
  smsConfirmLine1: "שלום {name},",
  smsConfirmLine2:
    "התור אצל {barber} נקבע ל-{date} בשעה {time}.",
  smsConfirmLine2Staff:
    "התור אצל {barber} עם {staff} נקבע ל-{date} בשעה {time}.",
  smsReminderLine1: "תזכורת: שלום {name},",
  smsReminderLine2:
    "התור אצל {barber} בעוד כ-{minutes} דקות ({time}).",
  smsReminderLine2Staff:
    "התור אצל {barber} עם {staff} בעוד כ-{minutes} דקות ({time}).",
  smsBarberCancel:
    "ביטול תור: {name} ביטל/ה את התור ב-{date} בשעה {time}.",
  smsBarberCancelStaff:
    "ביטול תור: {name} ביטל/ה אצל {staff} ב-{date} בשעה {time}.",

  errBarberNotFound: "ספר לא נמצא",
  errInvalidData: "נתונים לא תקינים",
  errNameRequired: "נא להזין שם מלא",
  errPhoneRequired: "נא להזין טלפון תקין",
  errPhoneInvalid: "טלפון לא תקין",
  errBarberInactive: "הספר לא פעיל",
  errSlotUnavailable: "השעה אינה פנויה",
  errSlotTaken: "השעה נתפסה בינתיים",
  errParams: "פרמטרים לא תקינים",
  errServer: "שגיאת שרת",
  errUnauthorized: "לא מחובר",
  errBadCredentials: "שם משתמש או סיסמה שגויים",
  errCancelLink: "קישור לא תקין",
  errCannotCancel: "לא ניתן לבטל את התור הזה",
  errAppointmentMissing: "תור לא נמצא",
  errAppointmentIdMissing: "מזהה תור חסר",
  errSmsPlanInactive: "שירות SMS אינו פעיל במנוי שלך",
  errDateInvalid: "תאריך לא תקין",
  errIdMissing: "מזהה חסר",
  errHoursOrder: "שעת התחלה חייבת להיות לפני שעת סיום",
  errStaffRequired: "נא לבחור ספר או כל מי שפנוי",
  errStaffNotFound: "ספר לא נמצא בצוות",
  errCannotDisableStaff:
    "לא ניתן להשבית — נשארו פחות משני ספרים פעילים ויש תורים עתידיים משובצים",
  errRecurringFields: "נא לבחור מחזור חוזר ותאריך סיום",
  filterAllStaff: "כל הספרים",
  withStaff: "עם",
  tabBook: "קביעת תור",
  bookOnce: "תור חד־פעמי",
  bookRecurring: "תור קבוע",
  intervalWeekly: "כל שבוע",
  intervalBiweekly: "כל שבועיים",
  intervalTriweekly: "כל 3 שבועות",
  intervalMonthly: "כל חודש",
  endDate: "עד תאריך",
  bookAdminCta: "קביעת התור",
  bookAdminSaving: "שומר...",
  bookAdminSuccess: "התור נקבע והשעה ירדה מהיומן הציבורי",
  bookRecurringSuccess: "נקבעו {count} תורים בסדרה",
  bookRecurringPartial: "נקבעו {count} תורים; חלק מהמועדים דולגו כי לא היו פנויים",
  barberPhone: "טלפון לקבלת התראות",
  barberPhoneHint: "יקבל SMS כשלקוח מבטל תור (דורש מנוי SMS)",
  notifyCancelToggle: "שלחו לי SMS כשלקוח מבטל תור",
  smsQuotaTitle: "מכסת הודעות",
  smsQuotaBalance: "יתרה: {remaining} מתוך {quota}",
  smsQuotaEmpty: "נגמרה מכסת ההודעות — תורים ייקבעו בלי SMS עד חידוש המכסה",
  smsQuotaLow:
    "שים לב: נותרו רק {remaining} הודעות SMS במנוי שלך. נא לפנות למנהל האפליקציה {admin} בטלפון {phone} לחידוש המכסה.",
  day0: "ראשון",
  day1: "שני",
  day2: "שלישי",
  day3: "רביעי",
  day4: "חמישי",
  day5: "שישי",
  day6: "שבת",
} as const;

const ar: { [K in keyof typeof he]: string } = {
  brand: "حلاق بكبسة زر",
  admin: "إدارة",
  bookTitle: "حجز موعد",
  pickDateTime: "اختاروا التاريخ والساعة المتاحة",
  pickStaff: "اختاروا الحلاق",
  staffAnyone: "أي شخص متاح",
  date: "التاريخ",
  time: "الساعة",
  loadingSlots: "جاري تحميل المواعيد...",
  noSlots: "لا توجد مواعيد متاحة في هذا التاريخ",
  fullName: "الاسم الكامل",
  phone: "الهاتف",
  phoneOptional: "الهاتف (اختياري — بدون هاتف لن يُرسل SMS)",
  bookCta: "حجز الموعد",
  bookingSaving: "جاري حفظ الموعد...",
  bookFailed: "تعذر حجز الموعد",
  networkError: "خطأ في الشبكة",
  bookSuccess: "تم حجز الموعد لـ {date} الساعة {time}. إلى اللقاء!",
  bookSuccessSms: " تم إرسال رسالة SMS إلى الهاتف.",
  bookSuccessSmsFail: "تم الحجز، لكن لم تُرسل رسالة SMS: {error}",

  loginTitle: "دخول المدير",
  loginSubtitle: "إدارة جدول {name}",
  username: "اسم المستخدم",
  password: "كلمة المرور",
  loginCta: "تسجيل الدخول",
  loggingIn: "جاري الدخول...",
  loginFailed: "فشل تسجيل الدخول",

  adminEyebrow: "حلاق بكبسة زر · إدارة",
  autoRefresh: "يتحدّث تلقائياً كل دقيقة",
  publicCalendar: "إلى الجدول العام",
  logout: "خروج",
  tabAppointments: "المواعيد",
  tabHours: "ساعات العمل",
  tabDaysOff: "أيام العطل",
  tabSms: "رسائل SMS",
  loading: "جاري التحميل...",
  loadError: "خطأ في تحميل البيانات",
  noAppointments: "لا مواعيد قريبة",
  today: "اليوم",
  nowInShop: "الآن في الصالون",
  nextUp: "التالي",
  cancelAppointment: "إلغاء الموعد",
  confirmCancel: "إلغاء هذا الموعد؟",
  cancelFailed: "فشل الإلغاء",
  cancelled: "تم إلغاء الموعد",
  active: "نشط",
  saveHours: "حفظ الساعات",
  hoursSaved: "تم تحديث ساعات العمل",
  saveFailed: "فشل الحفظ",
  noteOptional: "ملاحظة (اختياري)",
  add: "إضافة",
  remove: "إزالة",
  addFailed: "فشلت الإضافة",
  dayOffAdded: "تمت إضافة يوم عطلة",
  dayOffRemoved: "تمت إزالة يوم العطلة",
  noDaysOff: "لا أيام عطل قريبة",
  smsHelp:
    "يتلقى الزبون رسالة SMS عند تأكيد الموعد، وتذكيراً قبل الموعد. يمكن إيقاف ذلك أو تغيير وقت التذكير.",
  smsConfirmToggle: "إرسال SMS عند تأكيد الحجز",
  smsReminderToggle: "إرسال SMS تذكير قبل الموعد",
  reminderMinutes: "دقائق قبل الموعد للتذكير",
  reminderHint: "الافتراضي: 30 دقيقة (الحد الأدنى 5)",
  saveSettings: "حفظ الإعدادات",
  smsSaved: "تم حفظ إعدادات الرسائل",
  smsSaveFailed: "فشل حفظ إعدادات SMS",
  smsServiceTitle: "خدمة رسائل SMS",
  smsUpgrade:
    "للحصول على خدمة رسائل SMS يجب ترقية الاشتراك. يرجى التواصل مع مدير الموقع {name} {phone}.",
  contactAdmin: "تواصل مع {name}",

  cancelMeta: "إلغاء موعد",
  cancelHeading: "إلغاء موعد",
  cancelQuestion: "إلغاء الموعد؟",
  cancelCta: "إلغاء الموعد",
  cancelling: "جاري الإلغاء…",
  keepAppointment: "لا، شكراً — الإبقاء على الموعد",
  cancelSuccessTitle: "تم إلغاء الموعد",
  cancelSuccessBody:
    "تم إلغاء الموعد لدى {name} بنجاح. أصبحت الساعة متاحة مجدداً.",
  bookAgain: "لحجز موعد جديد",
  alreadyCancelledTitle: "الموعد ملغى مسبقاً",
  alreadyCancelledBody: "هذا الموعد أُلغي من قبل. لا حاجة لفعل أي شيء إضافي.",
  cannotCancelTitle: "لا يمكن الإلغاء",
  cannotCancelBody:
    "لا يمكن إلغاء هذا الموعد (ربما مرّ أو لم يعد فعّالاً). للاستفسار — تواصلوا مع الحلاق مباشرة.",
  invalidLinkTitle: "الرابط غير صالح",
  invalidLinkBody:
    "لم نجد موعداً لهذا الرابط. إذا ما زلتم بحاجة للإلغاء — تواصلوا مع الحلاق مباشرة.",
  incompleteLinkTitle: "رابط الإلغاء غير مكتمل",
  incompleteLinkBody:
    "فُتح رابط دون معرّف الموعد. حاولوا فتح الرابط الكامل من الرسالة مجدداً (ضغط طويل على العنوان ونسخه)، أو تواصلوا مع الحلاق للإلغاء.",
  backHome: "العودة إلى حلاق بكبسة زر",
  appointmentAt: "الموعد لدى",
  atTime: "الساعة",

  smsCancelLabel: "إلغاء:",
  smsConfirmLine1: "مرحباً {name}،",
  smsConfirmLine2:
    "تم حجز موعدك لدى {barber} لـ {date} الساعة {time}.",
  smsConfirmLine2Staff:
    "تم حجز موعدك لدى {barber} مع {staff} لـ {date} الساعة {time}.",
  smsReminderLine1: "تذكير: مرحباً {name}،",
  smsReminderLine2:
    "موعدك لدى {barber} خلال حوالي {minutes} دقيقة ({time}).",
  smsReminderLine2Staff:
    "موعدك لدى {barber} مع {staff} خلال حوالي {minutes} دقيقة ({time}).",
  smsBarberCancel:
    "إلغاء موعد: ألغى/ت {name} الموعد في {date} الساعة {time}.",
  smsBarberCancelStaff:
    "إلغاء موعد: ألغى/ت {name} الموعد لدى {staff} في {date} الساعة {time}.",

  errBarberNotFound: "الحلاق غير موجود",
  errInvalidData: "بيانات غير صالحة",
  errNameRequired: "يرجى إدخال الاسم الكامل",
  errPhoneRequired: "يرجى إدخال هاتف صالح",
  errPhoneInvalid: "الهاتف غير صالح",
  errBarberInactive: "الحلاق غير نشط",
  errSlotUnavailable: "الساعة غير متاحة",
  errSlotTaken: "تم حجز الساعة في الأثناء",
  errParams: "معاملات غير صالحة",
  errServer: "خطأ في الخادم",
  errUnauthorized: "غير متصل",
  errBadCredentials: "اسم المستخدم أو كلمة المرور غير صحيحة",
  errCancelLink: "رابط غير صالح",
  errCannotCancel: "لا يمكن إلغاء هذا الموعد",
  errAppointmentMissing: "الموعد غير موجود",
  errAppointmentIdMissing: "معرف الموعد مفقود",
  errSmsPlanInactive: "خدمة الرسائل النصية غير مفعّلة في اشتراكك",
  errDateInvalid: "تاريخ غير صالح",
  errIdMissing: "المعرّف مفقود",
  errHoursOrder: "ساعة البداية يجب أن تكون قبل ساعة النهاية",
  errStaffRequired: "يرجى اختيار حلاق أو أي شخص متاح",
  errStaffNotFound: "الحلاق غير موجود في الفريق",
  errCannotDisableStaff:
    "لا يمكن التعطيل — يتبقى أقل من حلاقين نشطين وهناك مواعيد مستقبلية معينة",
  errRecurringFields: "يرجى اختيار التكرار وتاريخ الانتهاء",
  filterAllStaff: "كل الحلاقين",
  withStaff: "مع",
  tabBook: "حجز موعد",
  bookOnce: "موعد لمرة واحدة",
  bookRecurring: "موعد ثابت",
  intervalWeekly: "كل أسبوع",
  intervalBiweekly: "كل أسبوعين",
  intervalTriweekly: "كل 3 أسابيع",
  intervalMonthly: "كل شهر",
  endDate: "حتى تاريخ",
  bookAdminCta: "تأكيد الحجز",
  bookAdminSaving: "جاري الحفظ...",
  bookAdminSuccess: "تم حجز الموعد وإزالته من الجدول العام",
  bookRecurringSuccess: "تم حجز {count} مواعيد في السلسلة",
  bookRecurringPartial: "تم حجز {count} مواعيد؛ تم تخطي بعضها لأنها غير متاحة",
  barberPhone: "هاتف لاستلام التنبيهات",
  barberPhoneHint: "سيصلك SMS عند إلغاء الزبون (يتطلب اشتراك SMS)",
  notifyCancelToggle: "أرسلوا لي SMS عند إلغاء الزبون",
  smsQuotaTitle: "حصة الرسائل",
  smsQuotaBalance: "المتبقي: {remaining} من أصل {quota}",
  smsQuotaEmpty: "انتهت حصة الرسائل — ستُحجز المواعيد دون SMS حتى تجديد الحصة",
  smsQuotaLow:
    "تنبيه: تبقّى فقط {remaining} رسائل SMS في اشتراكك. يرجى التواصل مع مدير التطبيق {admin} على الهاتف {phone} لتجديد الحصة.",
  day0: "الأحد",
  day1: "الاثنين",
  day2: "الثلاثاء",
  day3: "الأربعاء",
  day4: "الخميس",
  day5: "الجمعة",
  day6: "السبت",
};

const dict = { he, ar } as const;

export type MsgKey = keyof typeof he;

export function t(locale: Locale, key: MsgKey, vars?: Vars): string {
  let text: string = dict[locale][key] ?? dict.he[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}

export function dayNameLocalized(locale: Locale, dayOfWeek: number): string {
  const keys = [
    "day0",
    "day1",
    "day2",
    "day3",
    "day4",
    "day5",
    "day6",
  ] as const satisfies readonly MsgKey[];
  return t(locale, keys[dayOfWeek] ?? "day0");
}

export function formatDateLocalized(locale: Locale, date: Date): string {
  return date.toLocaleDateString(locale === "ar" ? "ar-IL" : "he-IL", {
    timeZone: "Asia/Jerusalem",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export async function getBarberLocale(barberId: string): Promise<Locale> {
  const barber = await prisma.barber.findUnique({
    where: { id: barberId },
    select: { locale: true },
  });
  return normalizeLocale(barber?.locale);
}
