import type { Locale } from '../data/portfolio'

export type PrivacyPolicySection = {
  id: string
  title: string
  paragraphs: string[]
}

type PrivacyPolicyContent = {
  eyebrow: string
  title: string
  introduction: string
  statusLabel: string
  status: string
  updatedLabel: string
  updated: string
  contentsLabel: string
  reviewNotice: string
  emailPrompt: string
  sections: PrivacyPolicySection[]
}

export const privacyPolicyContent: Record<Locale, PrivacyPolicyContent> = {
  en: {
    eyebrow: 'Privacy at SUMMIT',
    title: 'Privacy Policy',
    introduction: 'This policy explains how the SUMMIT Construction website handles information when you browse the site or contact us.',
    statusLabel: 'Policy status',
    status: 'Draft for client and legal review',
    updatedLabel: 'Last updated',
    updated: 'To be added after approval',
    contentsLabel: 'Contents',
    reviewNotice: 'This draft should be reviewed and approved by the client and legal adviser before publication as final legal content.',
    emailPrompt: 'Privacy questions and requests may be sent to:',
    sections: [
      {
        id: 'information-we-collect',
        title: 'Information We Collect',
        paragraphs: [
          'The website does not contain an enquiry form and does not collect contact details through website input fields. If you contact SUMMIT through WhatsApp or email, the relevant service and SUMMIT receive the information you choose to include in that message.',
          'Selecting a WhatsApp contact action prepares a message on the WhatsApp service. The website does not send that message or receive its contents.',
          'The website stores your selected dark or light appearance in local browser storage. Hosting and service providers may also process standard connection information, such as IP address, browser type, device information, and access time, as part of delivering their services.',
        ],
      },
      {
        id: 'how-we-use-information',
        title: 'How We Use Information',
        paragraphs: [
          'Information you send through WhatsApp or email may be used to respond to enquiries, understand project or service requirements, and manage correspondence. Technical information may be used to operate and secure the website.',
          'The current website does not use personal information for automated decision-making or behavioural advertising.',
        ],
      },
      {
        id: 'contact-enquiries',
        title: 'Contact Enquiries',
        paragraphs: [
          'WhatsApp is the primary enquiry channel. Until SUMMIT configures its approved business number, WhatsApp actions remain visibly unavailable and do not open an invalid or placeholder number.',
          'When enabled, a WhatsApp action opens the official WhatsApp service with a prepared message. Sending remains under your control and is handled by WhatsApp under its own terms and privacy practices.',
          'Using the direct email link opens the email service selected on your device. That provider handles the message under its own terms and privacy practices.',
        ],
      },
      {
        id: 'cookies-and-analytics',
        title: 'Cookies and Analytics',
        paragraphs: [
          'The website stores the selected appearance and any analytics-consent choice in local browser storage. These preferences are not used for advertising.',
          'Analytics cookies are not set by default. Google Analytics can load only when the analytics service is enabled and consent has been recorded. If activated, Google may process website usage information under its own privacy terms.',
        ],
      },
      {
        id: 'third-party-services',
        title: 'Third-Party Services',
        paragraphs: [
          'The website may rely on hosting, WhatsApp, email, and analytics providers. A provider receives information only when its service is used or enabled and processes that information under its own terms and privacy policy.',
          'SUMMIT does not control the independent privacy practices of third-party services. You should review the relevant provider terms when using those services.',
        ],
      },
      {
        id: 'data-retention-and-security',
        title: 'Data Retention and Security',
        paragraphs: [
          'The public website does not maintain its own enquiry database. Enquiry messages may be retained within WhatsApp or email services according to the relevant business purpose, applicable legal obligations, and provider practices. No fixed retention period is stated in this draft.',
          'The website limits the information requested and is intended to be served over HTTPS. No method of online transmission or storage can be guaranteed to be completely secure.',
        ],
      },
      {
        id: 'your-privacy-rights',
        title: 'Your Privacy Rights',
        paragraphs: [
          'Depending on the law that applies to you, you may have rights to request access to, correction of, or deletion of personal information, or to object to or restrict certain processing.',
          'Requests may be sent using the contact details below. SUMMIT may need to verify the request and may be required to retain some information where permitted or required by law.',
        ],
      },
      {
        id: 'contact-information',
        title: 'Contact Information',
        paragraphs: [
          'Please avoid including unnecessary sensitive or confidential information in an initial enquiry.',
        ],
      },
    ],
  },
  ar: {
    eyebrow: 'الخصوصية لدى سوميت',
    title: 'سياسة الخصوصية',
    introduction: 'توضح هذه السياسة كيفية تعامل موقع سوميت للإنشاءات مع المعلومات عند تصفح الموقع أو التواصل معنا.',
    statusLabel: 'حالة السياسة',
    status: 'مسودة لمراجعة العميل والمستشار القانوني',
    updatedLabel: 'آخر تحديث',
    updated: 'يُضاف بعد الاعتماد',
    contentsLabel: 'المحتويات',
    reviewNotice: 'يجب مراجعة هذه المسودة واعتمادها من العميل والمستشار القانوني قبل نشرها باعتبارها محتوى قانونيًا نهائيًا.',
    emailPrompt: 'يمكن إرسال أسئلة وطلبات الخصوصية إلى:',
    sections: [
      {
        id: 'information-we-collect',
        title: 'المعلومات التي نجمعها',
        paragraphs: [
          'لا يتضمن الموقع نموذج استفسار ولا يجمع بيانات التواصل عبر حقول إدخال. وإذا تواصلت مع سوميت عبر واتساب أو البريد الإلكتروني، فإن الخدمة المعنية وسوميت تتلقيان المعلومات التي تختار إدراجها في رسالتك.',
          'عند اختيار التواصل عبر واتساب، يُجهّز الموقع رسالة داخل خدمة واتساب. ولا يرسل الموقع هذه الرسالة ولا يتلقى محتواها.',
          'يحفظ الموقع اختيارك للمظهر الداكن أو الفاتح في مساحة التخزين المحلية للمتصفح. وقد يعالج مزودو الاستضافة والخدمات معلومات اتصال تقنية معتادة، مثل عنوان بروتوكول الإنترنت ونوع المتصفح ومعلومات الجهاز ووقت الوصول، كجزء من تقديم خدماتهم.',
        ],
      },
      {
        id: 'how-we-use-information',
        title: 'كيفية استخدام المعلومات',
        paragraphs: [
          'قد تُستخدم المعلومات التي ترسلها عبر واتساب أو البريد الإلكتروني للرد على الاستفسارات وفهم متطلبات المشروع أو الخدمة وإدارة المراسلات. وقد تُستخدم المعلومات التقنية لتشغيل الموقع وتأمينه.',
          'لا يستخدم الموقع الحالي المعلومات الشخصية لاتخاذ قرارات آلية أو للإعلانات السلوكية.',
        ],
      },
      {
        id: 'contact-enquiries',
        title: 'استفسارات التواصل',
        paragraphs: [
          'واتساب هو قناة الاستفسار الأساسية. وحتى تضيف سوميت رقم الأعمال المعتمد، تظل أزرار واتساب ظاهرة بوصفها غير متاحة ولا تفتح رقمًا غير صالح أو رقمًا تجريبيًا.',
          'عند تفعيلها، تفتح أزرار واتساب خدمة واتساب الرسمية مع رسالة مجهزة مسبقًا. ويظل إرسالها تحت سيطرتك وتتعامل واتساب معها وفق شروطها وممارسات الخصوصية لديها.',
          'يفتح رابط البريد المباشر خدمة البريد التي تختارها على جهازك، وتتعامل تلك الخدمة مع الرسالة وفق شروطها وممارسات الخصوصية لديها.',
        ],
      },
      {
        id: 'cookies-and-analytics',
        title: 'ملفات الارتباط والتحليلات',
        paragraphs: [
          'يحفظ الموقع المظهر المختار وأي اختيار يتعلق بالموافقة على التحليلات في مساحة التخزين المحلية للمتصفح. ولا تُستخدم هذه التفضيلات لأغراض إعلانية.',
          'لا تُفعّل ملفات ارتباط التحليلات افتراضيًا. ولا تعمل Google Analytics إلا عند تفعيل خدمة التحليلات وتسجيل الموافقة. وإذا فُعّلت، فقد تعالج Google معلومات استخدام الموقع وفق شروط الخصوصية الخاصة بها.',
        ],
      },
      {
        id: 'third-party-services',
        title: 'خدمات الجهات الخارجية',
        paragraphs: [
          'قد يعتمد الموقع على مزودي خدمات الاستضافة وواتساب والبريد الإلكتروني والتحليلات. ولا يتلقى المزود المعلومات إلا عند استخدام خدمته أو تفعيلها، ويعالجها وفق شروطه وسياسة الخصوصية الخاصة به.',
          'لا تتحكم سوميت في ممارسات الخصوصية المستقلة للجهات الخارجية. ويُنصح بمراجعة شروط المزود المعني عند استخدام تلك الخدمات.',
        ],
      },
      {
        id: 'data-retention-and-security',
        title: 'الاحتفاظ بالبيانات وأمنها',
        paragraphs: [
          'لا يحتفظ الموقع العام بقاعدة بيانات مستقلة للاستفسارات. وقد تُحفظ رسائل الاستفسار لدى واتساب أو خدمات البريد الإلكتروني وفق غرض العمل ذي الصلة والالتزامات القانونية المطبقة وممارسات المزود. ولا تحدد هذه المسودة مدة احتفاظ ثابتة.',
          'يحد الموقع من المعلومات المطلوبة، ومن المقرر تقديمه عبر اتصال HTTPS. ومع ذلك، لا يمكن ضمان الأمان الكامل لأي وسيلة نقل أو تخزين عبر الإنترنت.',
        ],
      },
      {
        id: 'your-privacy-rights',
        title: 'حقوقك المتعلقة بالخصوصية',
        paragraphs: [
          'بحسب القانون المطبق عليك، قد يكون لك الحق في طلب الوصول إلى المعلومات الشخصية أو تصحيحها أو حذفها، أو الاعتراض على بعض أوجه المعالجة أو تقييدها.',
          'يمكن إرسال الطلبات باستخدام بيانات التواصل أدناه. وقد تحتاج سوميت إلى التحقق من الطلب، وقد يلزم الاحتفاظ ببعض المعلومات عندما يسمح القانون بذلك أو يوجبه.',
        ],
      },
      {
        id: 'contact-information',
        title: 'بيانات التواصل',
        paragraphs: [
          'يُرجى تجنب إدراج معلومات حساسة أو سرية غير ضرورية في الاستفسار الأولي.',
        ],
      },
    ],
  },
}
