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
          'We collect information you choose to provide in an enquiry, including your name, email address, telephone number, optional company name, project or service interest, and message. If you contact us by email, we receive the information included in that message.',
          'The enquiry form may also include the current page address, selected language, and the time taken to submit the form. These details provide context and support basic spam prevention.',
          'The website stores your selected dark or light appearance in local browser storage. Hosting and service providers may also process standard connection information, such as IP address, browser type, device information, and access time, as part of delivering their services.',
        ],
      },
      {
        id: 'how-we-use-information',
        title: 'How We Use Information',
        paragraphs: [
          'Information is used to respond to enquiries, understand project or service requirements, manage correspondence, reduce misuse of the enquiry form, and operate the website.',
          'The current website does not use personal information for automated decision-making or behavioural advertising.',
        ],
      },
      {
        id: 'contact-enquiries',
        title: 'Contact Enquiries',
        paragraphs: [
          'The online form transfers information only when a form submission service is available. If that service is unavailable, the website does not show a success confirmation and directs visitors to the email option instead.',
          'A success message means that the form service accepted the enquiry. It does not, by itself, confirm email delivery or receipt by a member of the SUMMIT team.',
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
          'The website may rely on hosting, email, form-processing, and analytics providers. A provider receives information only when its service is used or enabled and processes that information under its own terms and privacy policy.',
          'SUMMIT does not control the independent privacy practices of third-party services. You should review the relevant provider terms when using those services.',
        ],
      },
      {
        id: 'data-retention-and-security',
        title: 'Data Retention and Security',
        paragraphs: [
          'The public website does not maintain its own enquiry database. Enquiry messages may be retained within email or form services according to the relevant business purpose, applicable legal obligations, and provider practices. No fixed retention period is stated in this draft.',
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
          'نجمع المعلومات التي تختار تقديمها ضمن الاستفسار، وتشمل الاسم والبريد الإلكتروني ورقم الهاتف واسم الشركة اختياريًا ونوع المشروع أو الخدمة محل الاهتمام والرسالة. وإذا تواصلت معنا عبر البريد الإلكتروني، فإننا نتلقى المعلومات الواردة في رسالتك.',
          'قد يتضمن نموذج الاستفسار أيضًا عنوان الصفحة الحالية واللغة المختارة والوقت المستغرق في إرسال النموذج، وذلك لتوفير سياق للاستفسار والمساعدة في الحد من الرسائل غير المرغوب فيها.',
          'يحفظ الموقع اختيارك للمظهر الداكن أو الفاتح في مساحة التخزين المحلية للمتصفح. وقد يعالج مزودو الاستضافة والخدمات معلومات اتصال تقنية معتادة، مثل عنوان بروتوكول الإنترنت ونوع المتصفح ومعلومات الجهاز ووقت الوصول، كجزء من تقديم خدماتهم.',
        ],
      },
      {
        id: 'how-we-use-information',
        title: 'كيفية استخدام المعلومات',
        paragraphs: [
          'نستخدم المعلومات للرد على الاستفسارات، وفهم متطلبات المشروع أو الخدمة، وإدارة المراسلات، والحد من إساءة استخدام نموذج الاستفسار، وتشغيل الموقع.',
          'لا يستخدم الموقع الحالي المعلومات الشخصية لاتخاذ قرارات آلية أو للإعلانات السلوكية.',
        ],
      },
      {
        id: 'contact-enquiries',
        title: 'استفسارات التواصل',
        paragraphs: [
          'لا ينقل النموذج الإلكتروني المعلومات إلا عند إتاحة خدمة إرسال النماذج. وإذا كانت الخدمة غير متاحة، فلن يعرض الموقع رسالة نجاح ويوجه الزائر إلى خيار البريد الإلكتروني بدلًا من ذلك.',
          'تعني رسالة النجاح أن خدمة النماذج قبلت الاستفسار، ولا تعد وحدها تأكيدًا على تسليم البريد الإلكتروني أو استلامه من أحد أعضاء فريق سوميت.',
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
          'قد يعتمد الموقع على مزودي خدمات الاستضافة والبريد الإلكتروني ومعالجة النماذج والتحليلات. ولا يتلقى المزود المعلومات إلا عند استخدام خدمته أو تفعيلها، ويعالجها وفق شروطه وسياسة الخصوصية الخاصة به.',
          'لا تتحكم سوميت في ممارسات الخصوصية المستقلة للجهات الخارجية. ويُنصح بمراجعة شروط المزود المعني عند استخدام تلك الخدمات.',
        ],
      },
      {
        id: 'data-retention-and-security',
        title: 'الاحتفاظ بالبيانات وأمنها',
        paragraphs: [
          'لا يحتفظ الموقع العام بقاعدة بيانات مستقلة للاستفسارات. وقد تُحفظ رسائل الاستفسار لدى خدمات البريد الإلكتروني أو النماذج وفق غرض العمل ذي الصلة والالتزامات القانونية المطبقة وممارسات المزود. ولا تحدد هذه المسودة مدة احتفاظ ثابتة.',
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
