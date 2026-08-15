import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "docs", "buyer-manual-shared.css"), "utf8");

const rtlExtra = `
    html[dir="rtl"],
    html[dir="rtl"] body {
      font-family: "Segoe UI", "Traditional Arabic", Tahoma, Arial, sans-serif;
      font-size: 10.8pt;
      line-height: 1.6;
      letter-spacing: 0 !important;
      word-spacing: 0;
      text-rendering: optimizeLegibility;
    }
    html[dir="rtl"] h1,
    html[dir="rtl"] h2,
    html[dir="rtl"] h3,
    html[dir="rtl"] .brand,
    html[dir="rtl"] .cover-meta strong,
    html[dir="rtl"] .callout strong,
    html[dir="rtl"] .step h3,
    html[dir="rtl"] .card h3,
    html[dir="rtl"] .feature h3 {
      font-family: "Segoe UI", "Traditional Arabic", Tahoma, Arial, sans-serif;
      letter-spacing: 0 !important;
      line-height: 1.55;
    }
    html[dir="rtl"] .cover-top,
    html[dir="rtl"] .cover-kicker,
    html[dir="rtl"] .brand span,
    html[dir="rtl"] .doc-label,
    html[dir="rtl"] .eyebrow,
    html[dir="rtl"] .step-no,
    html[dir="rtl"] .contact-item .label {
      letter-spacing: 0 !important;
      text-transform: none !important;
      line-height: 1.55;
    }
    html[dir="rtl"] p,
    html[dir="rtl"] li,
    html[dir="rtl"] td,
    html[dir="rtl"] .lede,
    html[dir="rtl"] .cover-sub,
    html[dir="rtl"] .check span {
      letter-spacing: 0 !important;
      line-height: 1.6;
      overflow-wrap: break-word;
      word-break: normal;
    }
    html[dir="rtl"] .page {
      min-height: 0 !important;
      max-height: 277mm;
      page-break-inside: avoid;
      break-inside: avoid;
      overflow: hidden;
    }
    html[dir="rtl"] .cover {
      min-height: 0 !important;
      max-height: 277mm;
      padding: 5mm 3mm 4mm;
      gap: 6mm;
    }
    html[dir="rtl"] .cover-hero { margin-top: 14mm; }
    html[dir="rtl"] .cover-sub { max-width: 155mm; margin-top: 5mm; }
    html[dir="rtl"] .cover-meta { align-items: start; margin-top: auto; }
    html[dir="rtl"] .cover-meta > div { min-height: 0; }
    html[dir="rtl"] .cover h1 { max-width: none; font-size: 28pt; }
    html[dir="rtl"] .page::before {
      width: 58%;
      max-width: 120mm;
    }
    html[dir="rtl"] .feature {
      border-left: none;
      border-right: 2.5px solid var(--accent);
      padding: 1mm 4mm 1mm 0;
    }
    html[dir="rtl"] .doc-label { text-align: left; }
    html[dir="rtl"] table.guide th,
    html[dir="rtl"] table.guide td { text-align: right; }
    html[dir="rtl"] ul.clean { padding-left: 0; padding-right: 4.5mm; }
    html[dir="rtl"] bdi,
    html[dir="rtl"] .ltr {
      unicode-bidi: isolate;
      direction: ltr;
      letter-spacing: 0;
    }
    html[dir="rtl"] h1.ltr,
    html[dir="rtl"] .value.ltr {
      display: block;
    }
`;

function wrap({ lang, dir, title, body }) {
  return `<!DOCTYPE html>
<html lang="${lang}"${dir === "rtl" ? ' dir="rtl"' : ""}>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
${css}
${dir === "rtl" ? rtlExtra : ""}
  </style>
</head>
<body>
${body}
</body>
</html>
`;
}

const manuals = [
  {
    file: "buyer-manual-ru.html",
    lang: "ru",
    title: "KOREA AUTO TRADE — Руководство покупателя",
    body: `
  <section class="page cover">
    <div class="cover-top">
      <div>RB Auto Co., Ltd.</div>
      <div>Руководство покупателя · 2026</div>
    </div>
    <div class="cover-hero">
      <div class="cover-kicker">Глобальная платформа торговли автомобилями</div>
      <h1>KOREA AUTO TRADE</h1>
      <hr class="cover-rule" />
      <p class="cover-sub">
        Понятное руководство для международных покупателей — актуальный склад,
        прозрачные предложения и структурированный процесс от запроса до отгрузки.
      </p>
    </div>
    <div class="cover-meta">
      <div><strong>Сайт</strong>rbautotrade.com</div>
      <div><strong>Аудитория</strong>Зарубежные дилеры и профессиональные покупатели</div>
      <div><strong>Фокус</strong>Прозрачность · Скорость · Надёжный процесс</div>
      <div><strong>Язык</strong>Русский</div>
    </div>
  </section>

  <section class="page">
    <div class="header">
      <div class="brand">KOREA AUTO TRADE<span>Руководство покупателя</span></div>
      <div class="doc-label">01 · Почему наша платформа</div>
    </div>
    <div class="eyebrow">Отличие</div>
    <h2>Почему наша платформа</h2>
    <p class="lede">
      KOREA AUTO TRADE снижает риски международной торговли автомобилями —
      живой склад, понятные данные объявлений и сопровождение сделки.
    </p>
    <div class="feature">
      <h3>Обновление склада в реальном времени</h3>
      <p>Новые позиции публикуются постоянно в разделах Car Listings, Live Auction, Stand by и Used Parts. Порядок на странице категории меняется при каждой перезагрузке, чтобы вы видели весь парк, а не один фиксированный список.</p>
    </div>
    <div class="feature">
      <h3>Прозрачная информация</h3>
      <p>В каждом объявлении — характеристики (VIN, КПП, пробег, топливо), описание состояния, фото и видео при наличии. Решение принимается по фактам, а не наугад.</p>
    </div>
    <div class="feature">
      <h3>Система предложений участников</h3>
      <p>Зарегистрированные участники оставляют предложения на странице объявления и отслеживают их в <strong>My offers</strong>. История переговоров сохраняется — в отличие от переписки в мессенджерах.</p>
    </div>
    <div class="feature">
      <h3>Понятный процесс покупки</h3>
      <p>От проверки цены до депозита и отгрузки раздел How to buy объясняет валюту, документы и ответственность за доставку в четырёх шагах.</p>
    </div>
    <div class="callout">
      <strong>Что это даёт вам</strong>
      Быстрее отбор, меньше повторных вопросов и профессиональный процесс для дилеров, закупающих в Корее.
    </div>
    <div class="footer"><span>rbautotrade.com</span><span>Стр. 2</span></div>
  </section>

  <section class="page">
    <div class="header">
      <div class="brand">KOREA AUTO TRADE<span>Руководство покупателя</span></div>
      <div class="doc-label">02 · Начало работы</div>
    </div>
    <div class="eyebrow">Доступ</div>
    <h2>Старт за три минуты</h2>
    <p class="lede">Большинство функций доступно без регистрации. Аккаунт открывает предложения, Live Auction и раздел My offers.</p>
    <div class="steps">
      <div class="step"><div class="step-no">Шаг 01</div><h3>Откройте сайт</h3><p>Перейдите на <strong>rbautotrade.com</strong> с компьютера или телефона.</p></div>
      <div class="step"><div class="step-no">Шаг 02</div><h3>Просмотрите склад</h3><p>Меню сверху: Live Auction, Car Listings, Stand by, Used Parts.</p></div>
      <div class="step"><div class="step-no">Шаг 03</div><h3>Создайте аккаунт</h3><p>Нажмите <strong>Join</strong>, заполните данные и дождитесь одобрения, если требуется.</p></div>
      <div class="step"><div class="step-no">Шаг 04</div><h3>Войдите и действуйте</h3><p>Через <strong>Login</strong> отправляйте предложения, открывайте Live Auction и ведите My offers.</p></div>
    </div>
    <h3 style="margin: 7mm 0 3mm; font-size: 12.5pt;">Карта меню</h3>
    <table class="guide">
      <tr><th>Car Listings</th><td>Основной склад. Порядок меняется при каждом визите; более дорогие позиции чаще выше.</td></tr>
      <tr><th>Live Auction</th><td>Аукционные лоты и предложения для участников (нужен вход).</td></tr>
      <tr><th>Stand by</th><td>Дополнительный готовый склад; порядок перемешивается при каждом заходе в меню.</td></tr>
      <tr><th>How to buy</th><td>Официальная 4-шаговая инструкция по покупке и отгрузке.</td></tr>
      <tr><th>About Us</th><td>О компании, преимущества и все каналы связи.</td></tr>
    </table>
    <div class="footer"><span>rbautotrade.com</span><span>Стр. 3</span></div>
  </section>

  <section class="page">
    <div class="header">
      <div class="brand">KOREA AUTO TRADE<span>Руководство покупателя</span></div>
      <div class="doc-label">03 · Склад и карточки</div>
    </div>
    <div class="eyebrow">Актуальный склад</div>
    <h2>Найти авто и оценить лот</h2>
    <p class="lede">Ищите по категориям, затем открывайте карточку для полной информации.</p>
    <div class="grid-2" style="margin-bottom: 5mm;">
      <div class="card"><h3>Поиск</h3><p>Верхняя строка: марка, модель, VIN, серийный номер (S/N) и примечания — удобно, если уже знаете лот.</p></div>
      <div class="card"><h3>Статус продажи</h3><p>Может быть в продаже, зарезервировано или продано. Для резерва и продажи действуют правила просмотра и оферт.</p></div>
    </div>
    <h3 style="font-size: 12.5pt; margin-bottom: 3mm;">На каждой карточке</h3>
    <ul class="clean">
      <li><strong>Идентификация</strong> — название, год / марка / модель, S/N</li>
      <li><strong>Характеристики</strong> — VIN, маркировка двигателя, КПП, пробег, топливо</li>
      <li><strong>Состояние</strong> — комментарии на английском, если есть</li>
      <li><strong>Медиа</strong> — фото и YouTube (если загружены)</li>
      <li><strong>Связь</strong> — WhatsApp, KakaoTalk, Messenger с данными авто</li>
      <li><strong>Оферты</strong> — история предложений для участников</li>
    </ul>
    <div class="pill-row" style="margin-top: 5mm;">
      <span class="pill">Прозрачные характеристики</span>
      <span class="pill">Фото + видео</span>
      <span class="pill">Сообщения в один клик</span>
      <span class="pill">История оферт</span>
    </div>
    <div class="callout">
      <strong>Совет импортёрам</strong>
      Откройте карточку → сначала фото, видео и примечания → напишите в WhatsApp/Messenger с автозаполненным текстом или оставьте оферту, чтобы сохранить историю.
    </div>
    <div class="footer"><span>rbautotrade.com</span><span>Стр. 4</span></div>
  </section>

  <section class="page">
    <div class="header">
      <div class="brand">KOREA AUTO TRADE<span>Руководство покупателя</span></div>
      <div class="doc-label">04 · Прозрачная торговля</div>
    </div>
    <div class="eyebrow">Целостность процесса</div>
    <h2>Оферта и следующий шаг</h2>
    <p class="lede">Сообщения быстрые. Платформа также даёт структурированные инструменты, чтобы цена и следующие шаги не терялись.</p>
    <div class="grid-3" style="margin-bottom: 6mm;">
      <div class="card"><h3>1. Запрос</h3><p>WhatsApp, KakaoTalk или Messenger. Кнопки на карточке подставляют данные авто.</p></div>
      <div class="card"><h3>2. Оферта</h3><p>Участники указывают сумму и валюту прямо на странице объявления.</p></div>
      <div class="card"><h3>3. Контроль</h3><p>В <strong>My offers</strong> видны открытые и закрытые интересы.</p></div>
    </div>
    <h3 style="font-size: 12.5pt; margin-bottom: 3mm;">Live Auction (участники)</h3>
    <p>Лоты Live Auction доступны зарегистрированным участникам. Гости видят сообщение с Login / Register. После входа можно смотреть лоты и участвовать через ту же систему оферт.</p>
    <h3 style="font-size: 12.5pt; margin: 5mm 0 3mm;">Что остаётся прозрачным</h3>
    <table class="guide">
      <tr><th>Данные лота</th><td>Характеристики, примечания, медиа и статус одинаково показаны на каждой странице.</td></tr>
      <tr><th>Связь</th><td>Официальные каналы — WhatsApp, KakaoTalk, Messenger, email — одна команда.</td></tr>
      <tr><th>Коммерческий путь</th><td>How to buy: цена → валюта инвойса → депозит → отгрузка.</td></tr>
      <tr><th>Активность</th><td>Все оферты хранятся в аккаунте для контроля и повторных сделок.</td></tr>
    </table>
    <div class="footer"><span>rbautotrade.com</span><span>Стр. 5</span></div>
  </section>

  <section class="page">
    <div class="header">
      <div class="brand">KOREA AUTO TRADE<span>Руководство покупателя</span></div>
      <div class="doc-label">05 · Как купить</div>
    </div>
    <div class="eyebrow">Система сопровождения</div>
    <h2>Четыре шага до отгрузки</h2>
    <p class="lede">Следуйте этому процессу. Подробности также на сайте в разделе <strong>How to buy</strong>.</p>
    <div class="steps">
      <div class="step"><div class="step-no">Шаг 01 · Цена</div><h3>Узнать цену</h3><p>Уточните цену конкретного лота в WhatsApp или другом официальном чате.</p><p class="note">Транспорт, налоги и экспортная декларация оплачиваются отдельно.</p></div>
      <div class="step"><div class="step-no">Шаг 02 · Инвойс</div><h3>Выставить инвойс</h3><p>Выберите валюту документов:</p><p class="note">KRW — налоговый инвойс / экспортная декларация · USD — экспортная декларация</p></div>
      <div class="step"><div class="step-no">Шаг 03 · Оплата</div><h3>Депозит</h3><p>Соблюдайте согласованную дату депозита. Отгрузка только после подтверждения оплаты / депозита.</p></div>
      <div class="step"><div class="step-no">Шаг 04 · Выпуск</div><h3>Отгрузка</h3><p>Доставку оплачивает покупатель. Организуйте транспорт сами или пришлите адрес и контакт — поможем оформить.</p></div>
    </div>
    <div class="callout" style="margin-top: 8mm;">
      <strong>Срочные вопросы</strong>
      Для срочных тем лучше <strong style="display:inline;font-family:inherit;font-size:inherit;">KakaoTalk</strong>
      или <strong style="display:inline;font-family:inherit;font-size:inherit;">Facebook Messenger</strong>
      — команда отвечает быстрее в рабочие часы.
    </div>
    <div class="footer"><span>rbautotrade.com</span><span>Стр. 6</span></div>
  </section>

  <section class="page">
    <div class="header">
      <div class="brand">KOREA AUTO TRADE<span>Руководство покупателя</span></div>
      <div class="doc-label">06 · Контакты и чек-лист</div>
    </div>
    <div class="eyebrow">Поддержка</div>
    <h2>Официальные каналы</h2>
    <p class="lede">По возможности используйте кнопки на карточке — так проще определить конкретный автомобиль.</p>
    <div class="contact-grid">
      <div class="contact-item"><div class="label">Email</div><div class="value">rbautoscrap@naver.com</div></div>
      <div class="contact-item"><div class="label">Телефон / KakaoTalk</div><div class="value">+82 10-5817-2207</div></div>
      <div class="contact-item"><div class="label">WhatsApp</div><div class="value">wa.me · +82 10-5817-2207</div></div>
      <div class="contact-item"><div class="label">Facebook Messenger</div><div class="value">m.me/rbautoscrap</div></div>
      <div class="contact-item"><div class="label">KakaoTalk Open Chat</div><div class="value">open.kakao.com/o/sRRldQFi</div></div>
      <div class="contact-item"><div class="label">Часы работы</div><div class="value">Пн – Пт, 09:00 – 18:00 (KST)</div></div>
    </div>
    <h3 style="font-size: 12.5pt; margin: 7mm 0 2mm;">Чек-лист покупателя</h3>
    <div class="checklist">
      <div class="check"><i></i><span>Создать / подтвердить аккаунт</span></div>
      <div class="check"><i></i><span>Отобрать лоты по фото, видео и примечаниям</span></div>
      <div class="check"><i></i><span>Проверить статус до переговоров</span></div>
      <div class="check"><i></i><span>Запрос с S/N или ссылкой на объявление</span></div>
      <div class="check"><i></i><span>Отправить оферту, когда готовы</span></div>
      <div class="check"><i></i><span>Согласовать валюту и тип документов</span></div>
      <div class="check"><i></i><span>Внести депозит в срок</span></div>
      <div class="check"><i></i><span>Организовать доставку после подтверждения</span></div>
    </div>
    <div class="callout" style="margin-top: 8mm;">
      <strong>KOREA AUTO TRADE · RB Auto Co., Ltd.</strong>
      Спасибо, что закупаете у нас. По партнёрству и оптовым программам пишите на rbautoscrap@naver.com — укажите профиль компании и целевые рынки.
    </div>
    <div class="footer"><span>rbautotrade.com</span><span>Стр. 7</span></div>
  </section>
`,
  },
  {
    file: "buyer-manual-es.html",
    lang: "es",
    title: "KOREA AUTO TRADE — Manual del comprador",
    body: `
  <section class="page cover">
    <div class="cover-top">
      <div>RB Auto Co., Ltd.</div>
      <div>Manual del comprador · 2026</div>
    </div>
    <div class="cover-hero">
      <div class="cover-kicker">Plataforma global de comercio de vehículos</div>
      <h1>KOREA AUTO TRADE</h1>
      <hr class="cover-rule" />
      <p class="cover-sub">
        Guía clara para compradores internacionales — inventario en tiempo real,
        ofertas transparentes y un proceso estructurado desde la consulta hasta el envío.
      </p>
    </div>
    <div class="cover-meta">
      <div><strong>Sitio web</strong>rbautotrade.com</div>
      <div><strong>Audiencia</strong>Concesionarios y compradores profesionales de Latinoamérica</div>
      <div><strong>Enfoque</strong>Transparencia · Rapidez · Proceso confiable</div>
      <div><strong>Idioma</strong>Español</div>
    </div>
  </section>

  <section class="page">
    <div class="header">
      <div class="brand">KOREA AUTO TRADE<span>Manual del comprador</span></div>
      <div class="doc-label">01 · Por qué nuestra plataforma</div>
    </div>
    <div class="eyebrow">Diferenciación</div>
    <h2>Por qué nuestra plataforma</h2>
    <p class="lede">KOREA AUTO TRADE reduce problemas del comercio transfronterizo: inventario en vivo, datos claros y un proceso de compra guiado.</p>
    <div class="feature"><h3>Actualización en tiempo real</h3><p>Se publican unidades nuevas de forma continua en Car Listings, Live Auction, Stand by y Used Parts. El orden de cada categoría cambia al recargar, para que vea todo el parque y no una sola lista fija.</p></div>
    <div class="feature"><h3>Información transparente</h3><p>Cada aviso muestra especificaciones (VIN, transmisión, odómetro, combustible), notas de condición, fotos y video cuando hay — para decidir con hechos, no por suposición.</p></div>
    <div class="feature"><h3>Sistema de ofertas de miembros</h3><p>Los miembros registrados envían ofertas en el aviso y las siguen en <strong>My offers</strong>. Queda un historial claro, más allá de chats que se pueden borrar.</p></div>
    <div class="feature"><h3>Proceso de compra guiado</h3><p>De la consulta de precio al depósito y el envío, How to buy explica moneda, documentos y responsabilidad de flete en cuatro pasos.</p></div>
    <div class="callout"><strong>Qué significa para usted</strong>Selección más rápida, menos preguntas repetidas y un proceso profesional para importadores que compran en Corea.</div>
    <div class="footer"><span>rbautotrade.com</span><span>Pág. 2</span></div>
  </section>

  <section class="page">
    <div class="header">
      <div class="brand">KOREA AUTO TRADE<span>Manual del comprador</span></div>
      <div class="doc-label">02 · Primeros pasos</div>
    </div>
    <div class="eyebrow">Acceso</div>
    <h2>Empiece en tres minutos</h2>
    <p class="lede">La mayoría de funciones se usan sin registro. El registro abre ofertas, Live Auction y el seguimiento en My offers.</p>
    <div class="steps">
      <div class="step"><div class="step-no">Paso 01</div><h3>Abra el sitio</h3><p>Visite <strong>rbautotrade.com</strong> en computadora o móvil.</p></div>
      <div class="step"><div class="step-no">Paso 02</div><h3>Revise el inventario</h3><p>Menú superior: Live Auction, Car Listings, Stand by, Used Parts.</p></div>
      <div class="step"><div class="step-no">Paso 03</div><h3>Cree una cuenta</h3><p>Pulse <strong>Join</strong>, envíe sus datos y espere aprobación si corresponde.</p></div>
      <div class="step"><div class="step-no">Paso 04</div><h3>Inicie sesión</h3><p>Con <strong>Login</strong> envíe ofertas, abra Live Auction y gestione My offers.</p></div>
    </div>
    <h3 style="margin: 7mm 0 3mm; font-size: 12.5pt;">Mapa del menú</h3>
    <table class="guide">
      <tr><th>Car Listings</th><td>Inventario principal. El orden rota en cada visita; las unidades de mayor costo suelen aparecer antes.</td></tr>
      <tr><th>Live Auction</th><td>Lotes de subasta y ofertas para miembros (requiere inicio de sesión).</td></tr>
      <tr><th>Stand by</th><td>Stock listo adicional; se mezcla en cada visita al menú.</td></tr>
      <tr><th>How to buy</th><td>Guía oficial de 4 pasos para compra y envío.</td></tr>
      <tr><th>About Us</th><td>Perfil de la empresa, fortalezas y todos los contactos.</td></tr>
    </table>
    <div class="footer"><span>rbautotrade.com</span><span>Pág. 3</span></div>
  </section>

  <section class="page">
    <div class="header">
      <div class="brand">KOREA AUTO TRADE<span>Manual del comprador</span></div>
      <div class="doc-label">03 · Inventario y fichas</div>
    </div>
    <div class="eyebrow">Stock en tiempo real</div>
    <h2>Encontrar y evaluar unidades</h2>
    <p class="lede">Use búsqueda y categorías para preseleccionar; luego abra la ficha completa.</p>
    <div class="grid-2" style="margin-bottom: 5mm;">
      <div class="card"><h3>Búsqueda</h3><p>La barra superior admite marca, modelo, VIN, número de serie (S/N) y notas — útil si ya conoce la unidad.</p></div>
      <div class="card"><h3>Estado de venta</h3><p>Puede estar en venta, reservado o vendido. Reservado / vendido sigue las reglas de visualización y ofertas.</p></div>
    </div>
    <h3 style="font-size: 12.5pt; margin-bottom: 3mm;">En cada ficha</h3>
    <ul class="clean">
      <li><strong>Identidad</strong> — título, año / marca / modelo, S/N</li>
      <li><strong>Especificaciones</strong> — VIN, marca de motor, transmisión, odómetro, combustible</li>
      <li><strong>Notas</strong> — comentarios en inglés cuando hay</li>
      <li><strong>Medios</strong> — fotos y video de YouTube (si se cargó)</li>
      <li><strong>Contacto</strong> — WhatsApp, KakaoTalk, Messenger con el contexto del vehículo</li>
      <li><strong>Ofertas</strong> — historial para miembros conectados</li>
    </ul>
    <div class="pill-row" style="margin-top: 5mm;">
      <span class="pill">Especificaciones claras</span>
      <span class="pill">Foto + video</span>
      <span class="pill">Mensaje en un toque</span>
      <span class="pill">Historial de ofertas</span>
    </div>
    <div class="callout"><strong>Consejo para importadores</strong>Abra la ficha → revise notas y medios → envíe WhatsApp/Messenger con el texto del vehículo, o deje una oferta para guardar el historial.</div>
    <div class="footer"><span>rbautotrade.com</span><span>Pág. 4</span></div>
  </section>

  <section class="page">
    <div class="header">
      <div class="brand">KOREA AUTO TRADE<span>Manual del comprador</span></div>
      <div class="doc-label">04 · Comercio transparente</div>
    </div>
    <div class="eyebrow">Integridad del proceso</div>
    <h2>Oferta y siguiente paso</h2>
    <p class="lede">Los mensajes son rápidos. La plataforma también organiza precio y seguimiento.</p>
    <div class="grid-3" style="margin-bottom: 6mm;">
      <div class="card"><h3>1. Consultar</h3><p>WhatsApp, KakaoTalk o Messenger. Los botones de la ficha adjuntan la identidad del vehículo.</p></div>
      <div class="card"><h3>2. Ofertar</h3><p>Los miembros envían monto y moneda en la página del aviso.</p></div>
      <div class="card"><h3>3. Seguir</h3><p>En <strong>My offers</strong> ve intereses abiertos y cerrados.</p></div>
    </div>
    <h3 style="font-size: 12.5pt; margin-bottom: 3mm;">Live Auction (miembros)</h3>
    <p>Los lotes Live Auction son para miembros registrados. Los invitados ven Login / Register. Al entrar puede revisar unidades y participar con el mismo flujo de ofertas.</p>
    <h3 style="font-size: 12.5pt; margin: 5mm 0 3mm;">Qué permanece transparente</h3>
    <table class="guide">
      <tr><th>Datos del aviso</th><td>Especificaciones, notas, medios y estado se muestran igual en cada página.</td></tr>
      <tr><th>Comunicación</th><td>Canales oficiales — WhatsApp, KakaoTalk, Messenger, email — el mismo equipo.</td></tr>
      <tr><th>Ruta comercial</th><td>How to buy: precio → moneda de factura → depósito → liberación de envío.</td></tr>
      <tr><th>Actividad</th><td>Todas las ofertas quedan en su cuenta para seguimiento.</td></tr>
    </table>
    <div class="footer"><span>rbautotrade.com</span><span>Pág. 5</span></div>
  </section>

  <section class="page">
    <div class="header">
      <div class="brand">KOREA AUTO TRADE<span>Manual del comprador</span></div>
      <div class="doc-label">05 · Cómo comprar</div>
    </div>
    <div class="eyebrow">Sistema de guía</div>
    <h2>Cuatro pasos hasta el envío</h2>
    <p class="lede">Siga este proceso. El detalle también está en el sitio en <strong>How to buy</strong>.</p>
    <div class="steps">
      <div class="step"><div class="step-no">Paso 01 · Precio</div><h3>Recibir precio</h3><p>Consulte el precio de la unidad por WhatsApp u otro chat oficial.</p><p class="note">Transporte, impuestos y certificado de exportación se cobran por separado.</p></div>
      <div class="step"><div class="step-no">Paso 02 · Factura</div><h3>Emitir factura</h3><p>Elija la moneda de los documentos:</p><p class="note">KRW — factura fiscal / declaración de exportación · USD — declaración de exportación</p></div>
      <div class="step"><div class="step-no">Paso 03 · Pago</div><h3>Depósito</h3><p>Respete la fecha de depósito acordada. El envío se organiza solo tras confirmar el pago / depósito.</p></div>
      <div class="step"><div class="step-no">Paso 04 · Liberación</div><h3>Envío</h3><p>El comprador cubre el flete. Organice el transporte o envíe dirección y contacto para que lo ayudemos.</p></div>
    </div>
    <div class="callout" style="margin-top: 8mm;"><strong>Asuntos urgentes</strong>Para temas con prisa, use <strong style="display:inline;font-family:inherit;font-size:inherit;">KakaoTalk</strong> o <strong style="display:inline;font-family:inherit;font-size:inherit;">Facebook Messenger</strong> en horario laboral.</div>
    <div class="footer"><span>rbautotrade.com</span><span>Pág. 6</span></div>
  </section>

  <section class="page">
    <div class="header">
      <div class="brand">KOREA AUTO TRADE<span>Manual del comprador</span></div>
      <div class="doc-label">06 · Contacto y lista</div>
    </div>
    <div class="eyebrow">Soporte</div>
    <h2>Canales oficiales</h2>
    <p class="lede">Use los botones de la ficha cuando pueda — ayudan a identificar el vehículo exacto.</p>
    <div class="contact-grid">
      <div class="contact-item"><div class="label">Email</div><div class="value">rbautoscrap@naver.com</div></div>
      <div class="contact-item"><div class="label">Teléfono / KakaoTalk</div><div class="value">+82 10-5817-2207</div></div>
      <div class="contact-item"><div class="label">WhatsApp</div><div class="value">wa.me · +82 10-5817-2207</div></div>
      <div class="contact-item"><div class="label">Facebook Messenger</div><div class="value">m.me/rbautoscrap</div></div>
      <div class="contact-item"><div class="label">KakaoTalk Open Chat</div><div class="value">open.kakao.com/o/sRRldQFi</div></div>
      <div class="contact-item"><div class="label">Horario</div><div class="value">Lun – Vie, 09:00 – 18:00 (KST)</div></div>
    </div>
    <h3 style="font-size: 12.5pt; margin: 7mm 0 2mm;">Lista del comprador</h3>
    <div class="checklist">
      <div class="check"><i></i><span>Crear / aprobar su cuenta</span></div>
      <div class="check"><i></i><span>Preseleccionar con fotos, video y notas</span></div>
      <div class="check"><i></i><span>Confirmar estado de venta antes de negociar</span></div>
      <div class="check"><i></i><span>Consultar con S/N o enlace del aviso</span></div>
      <div class="check"><i></i><span>Enviar oferta de miembro cuando esté listo</span></div>
      <div class="check"><i></i><span>Acordar moneda y tipo de documento</span></div>
      <div class="check"><i></i><span>Pagar el depósito en la fecha acordada</span></div>
      <div class="check"><i></i><span>Organizar el envío tras la confirmación</span></div>
    </div>
    <div class="callout" style="margin-top: 8mm;"><strong>KOREA AUTO TRADE · RB Auto Co., Ltd.</strong>Gracias por comprar con nosotros. Para alianzas o programas de volumen, escriba a rbautoscrap@naver.com con el perfil de su empresa y mercados objetivo.</div>
    <div class="footer"><span>rbautotrade.com</span><span>Pág. 7</span></div>
  </section>
`,
  },
  {
    file: "buyer-manual-ar.html",
    lang: "ar",
    dir: "rtl",
    title: "KOREA AUTO TRADE — دليل المشتري",
    body: `
  <section class="page cover">
    <div class="cover-top">
      <div class="ltr">RB Auto Co., Ltd.</div>
      <div>دليل المشتري · 2026</div>
    </div>
    <div class="cover-hero">
      <div class="cover-kicker">منصة عالمية لتجارة السيارات</div>
      <h1 class="ltr">KOREA AUTO TRADE</h1>
      <hr class="cover-rule" />
      <p class="cover-sub">
        دليل واضح للمشترين الدوليين — مخزون محدّث، عروض شفافة، ومسار منظم من الاستفسار حتى الشحن.
      </p>
    </div>
    <div class="cover-meta">
      <div><strong>الموقع</strong><span class="ltr">rbautotrade.com</span></div>
      <div><strong>الجمهور</strong>تجار ومستوردون محترفون في الدول العربية</div>
      <div><strong>التركيز</strong>الشفافية · السرعة · عملية موثوقة</div>
      <div><strong>اللغة</strong>العربية</div>
    </div>
  </section>

  <section class="page">
    <div class="header">
      <div class="brand"><span class="ltr">KOREA AUTO TRADE</span><span>دليل المشتري</span></div>
      <div class="doc-label">01 · لماذا منصتنا</div>
    </div>
    <div class="eyebrow">التميّز</div>
    <h2>لماذا منصتنا</h2>
    <p class="lede">صُممت <bdi class="ltr">KOREA AUTO TRADE</bdi> لتقليل مشكلات التجارة العابرة للحدود: مخزون حي، بيانات واضحة، وعملية شراء موجهة.</p>
    <div class="feature"><h3>تحديث المخزون فوراً</h3><p>تُنشر الوحدات الجديدة باستمرار في <bdi class="ltr">Car Listings</bdi> و<bdi class="ltr">Live Auction</bdi> و<bdi class="ltr">Stand by</bdi> و<bdi class="ltr">Used Parts</bdi>. يتغيّر ترتيب الصفحة عند كل إعادة تحميل حتى ترى كل السيارات لا قائمة ثابتة واحدة.</p></div>
    <div class="feature"><h3>معلومات شفافة</h3><p>كل إعلان يعرض المواصفات (VIN، ناقل الحركة، العداد، الوقود) وملاحظات الحالة والصور والفيديو إن وُجد — لتقرر بناءً على حقائق.</p></div>
    <div class="feature"><h3>نظام عروض الأعضاء</h3><p>يقدّم الأعضاء عروضاً على صفحة الإعلان ويتابعونها في <strong class="ltr">My offers</strong>. يبقى سجل التفاوض واضحاً، أكثر من رسائل يمكن حذفها.</p></div>
    <div class="feature"><h3>عملية شراء موجهة</h3><p>من التحقق من السعر إلى العربون والشحن، يشرح <bdi class="ltr">How to buy</bdi> العملة والمستندات ومسؤولية الشحن في أربع خطوات.</p></div>
    <div class="callout"><strong>ماذا يعني ذلك لك</strong>فرز أسرع، أسئلة أقل تكراراً، وعملية احترافية للمستوردين من كوريا.</div>
    <div class="footer"><span>rbautotrade.com</span><span>ص 2</span></div>
  </section>

  <section class="page">
    <div class="header">
      <div class="brand"><span class="ltr">KOREA AUTO TRADE</span><span>دليل المشتري</span></div>
      <div class="doc-label">02 · البدء</div>
    </div>
    <div class="eyebrow">الوصول</div>
    <h2>ابدأ خلال ثلاث دقائق</h2>
    <p class="lede">معظم الميزات تعمل دون تسجيل. التسجيل يفتح العروض و<bdi class="ltr">Live Auction</bdi> ومتابعة <bdi class="ltr">My offers</bdi>.</p>
    <div class="steps">
      <div class="step"><div class="step-no">الخطوة 01</div><h3>افتح الموقع</h3><p>زر <strong class="ltr">rbautotrade.com</strong> من الحاسوب أو الجوال.</p></div>
      <div class="step"><div class="step-no">الخطوة 02</div><h3>تصفّح المخزون</h3><p>القائمة العلوية: <bdi class="ltr">Live Auction</bdi>، <bdi class="ltr">Car Listings</bdi>، <bdi class="ltr">Stand by</bdi>، <bdi class="ltr">Used Parts</bdi>.</p></div>
      <div class="step"><div class="step-no">الخطوة 03</div><h3>أنشئ حساباً</h3><p>اضغط <strong class="ltr">Join</strong> وأرسل بياناتك وانتظر الموافقة إن لزم.</p></div>
      <div class="step"><div class="step-no">الخطوة 04</div><h3>سجّل الدخول</h3><p>عبر <strong class="ltr">Login</strong> أرسل العروض وافتح <bdi class="ltr">Live Auction</bdi> وأدر <bdi class="ltr">My offers</bdi>.</p></div>
    </div>
    <h3 style="margin: 7mm 0 3mm; font-size: 12.5pt;">خريطة القائمة</h3>
    <table class="guide">
      <tr><th class="ltr">Car Listings</th><td>المخزون الأساسي. يتغيّر الترتيب في كل زيارة، وغالباً تظهر الوحدات الأعلى تكلفة أولاً.</td></tr>
      <tr><th class="ltr">Live Auction</th><td>مزادات وعروض للأعضاء (يتطلب تسجيل الدخول).</td></tr>
      <tr><th class="ltr">Stand by</th><td>مخزون جاهز إضافي؛ يُخلط عند كل دخول للقائمة.</td></tr>
      <tr><th class="ltr">How to buy</th><td>دليل رسمي من 4 خطوات للشراء والشحن.</td></tr>
      <tr><th class="ltr">About Us</th><td>ملف الشركة ونقاط القوة وكل قنوات التواصل.</td></tr>
    </table>
    <div class="footer"><span>rbautotrade.com</span><span>ص 3</span></div>
  </section>

  <section class="page">
    <div class="header">
      <div class="brand"><span class="ltr">KOREA AUTO TRADE</span><span>دليل المشتري</span></div>
      <div class="doc-label">03 · المخزون والصفحات</div>
    </div>
    <div class="eyebrow">مخزون حي</div>
    <h2>ابحث عن السيارات وقيّم الوحدات</h2>
    <p class="lede">استخدم البحث والتصنيفات ثم افتح صفحة الإعلان للتفاصيل الكاملة.</p>
    <div class="grid-2" style="margin-bottom: 5mm;">
      <div class="card"><h3>البحث</h3><p>شريط البحث يدعم الشركة والموديل وVIN والرقم التسلسلي (S/N) والملاحظات.</p></div>
      <div class="card"><h3>حالة البيع</h3><p>قد تكون معروضة أو محجوزة أو مباعة. للحجز والمباع قواعد للعرض والعروض.</p></div>
    </div>
    <h3 style="font-size: 12.5pt; margin-bottom: 3mm;">في كل صفحة إعلان</h3>
    <ul class="clean">
      <li><strong>هوية المركبة</strong> — العنوان، السنة / الشركة / الموديل، S/N</li>
      <li><strong>المواصفات</strong> — VIN، علامة المحرك، ناقل الحركة، العداد، الوقود</li>
      <li><strong>ملاحظات الحالة</strong> — تعليقات بالإنجليزية عند التوفر</li>
      <li><strong>الوسائط</strong> — صور وفيديو يوتيوب إن وُجد</li>
      <li><strong>تواصل مباشر</strong> — واتساب وكاكاو وتوك وماسنجر مع بيانات السيارة</li>
      <li><strong>لوحة العروض</strong> — سجل العروض للأعضاء</li>
    </ul>
    <div class="pill-row" style="margin-top: 5mm;">
      <span class="pill">مواصفات شفافة</span>
      <span class="pill">صور + فيديو</span>
      <span class="pill">مراسلة بنقرة</span>
      <span class="pill">سجل العروض</span>
    </div>
    <div class="callout"><strong>نصيحة للمستورد</strong>افتح الإعلان → راجع الملاحظات والوسائط أولاً → أرسل واتساب/ماسنجر بالنص التلقائي، أو قدّم عرضاً لحفظ السجل.</div>
    <div class="footer"><span>rbautotrade.com</span><span>ص 4</span></div>
  </section>

  <section class="page">
    <div class="header">
      <div class="brand"><span class="ltr">KOREA AUTO TRADE</span><span>دليل المشتري</span></div>
      <div class="doc-label">04 · تجارة شفافة</div>
    </div>
    <div class="eyebrow">سلامة العملية</div>
    <h2>العرض والخطوة التالية</h2>
    <p class="lede">الرسائل سريعة. والمنصة تنظّم مناقشة السعر والمتابعة.</p>
    <div class="grid-3" style="margin-bottom: 6mm;">
      <div class="card"><h3>1. استفسر</h3><p>واتساب أو كاكاو أو ماسنجر. أزرار الإعلان ترفق هوية السيارة.</p></div>
      <div class="card"><h3>2. قدّم عرضاً</h3><p>يضع الأعضاء المبلغ والعملة في صفحة الإعلان.</p></div>
      <div class="card"><h3>3. تابع</h3><p>في <strong class="ltr">My offers</strong> ترى الاهتمامات المفتوحة والمغلقة.</p></div>
    </div>
    <h3 style="font-size: 12.5pt; margin-bottom: 3mm;"><span class="ltr">Live Auction</span> (للأعضاء)</h3>
    <p>مزادات <bdi class="ltr">Live Auction</bdi> للأعضاء المسجّلين. الزوار يرون <bdi class="ltr">Login / Register</bdi>. بعد الدخول يمكن مراجعة الوحدات والمشاركة بنفس مسار العروض.</p>
    <h3 style="font-size: 12.5pt; margin: 5mm 0 3mm;">ما يبقى شفافاً</h3>
    <table class="guide">
      <tr><th>بيانات الإعلان</th><td>المواصفات والملاحظات والوسائط والحالة تظهر بشكل موحّد.</td></tr>
      <tr><th>التواصل</th><td>قنوات رسمية — واتساب، كاكاو، ماسنجر، بريد — نفس الفريق.</td></tr>
      <tr><th>المسار التجاري</th><td><bdi class="ltr">How to buy</bdi>: السعر → عملة الفاتورة → العربون → الإفراج للشحن.</td></tr>
      <tr><th>نشاط العضو</th><td>تُحفظ كل العروض في حسابك للمتابعة.</td></tr>
    </table>
    <div class="footer"><span>rbautotrade.com</span><span>ص 5</span></div>
  </section>

  <section class="page">
    <div class="header">
      <div class="brand"><span class="ltr">KOREA AUTO TRADE</span><span>دليل المشتري</span></div>
      <div class="doc-label">05 · كيف تشتري</div>
    </div>
    <div class="eyebrow">نظام الإرشاد</div>
    <h2>أربع خطوات حتى الشحن</h2>
    <p class="lede">اتبع هذه العملية. التفاصيل أيضاً في الموقع ضمن <strong class="ltr">How to buy</strong>.</p>
    <div class="steps">
      <div class="step"><div class="step-no">الخطوة 01 · السعر</div><h3>استلام السعر</h3><p>تحقق من سعر الوحدة عبر واتساب أو قناة رسمية أخرى.</p><p class="note">النقل والضرائب وشهادة التصدير تُحسب بشكل منفصل.</p></div>
      <div class="step"><div class="step-no">الخطوة 02 · الفاتورة</div><h3>إصدار الفاتورة</h3><p>اختر عملة المستندات:</p><p class="note">KRW — فاتورة ضريبية / بيان تصدير · USD — بيان تصدير</p></div>
      <div class="step"><div class="step-no">الخطوة 03 · الدفع</div><h3>العربون</h3><p>التزم بتاريخ العربون المتفق عليه. يُرتَّب الشحن فقط بعد تأكيد الدفع / العربون.</p></div>
      <div class="step"><div class="step-no">الخطوة 04 · الإفراج</div><h3>الشحن</h3><p>المشتري يتحمل تكلفة الشحن. نظّم النقل بنفسك أو أرسل العنوان ورقم التواصل للمساعدة.</p></div>
    </div>
    <div class="callout" style="margin-top: 8mm;"><strong>أمور عاجلة</strong>للأسئلة المستعجلة فضّل <strong style="display:inline;font-family:inherit;font-size:inherit;">KakaoTalk</strong> أو <strong style="display:inline;font-family:inherit;font-size:inherit;">Facebook Messenger</strong> خلال ساعات العمل.</div>
    <div class="footer"><span>rbautotrade.com</span><span>ص 6</span></div>
  </section>

  <section class="page">
    <div class="header">
      <div class="brand"><span class="ltr">KOREA AUTO TRADE</span><span>دليل المشتري</span></div>
      <div class="doc-label">06 · التواصل والقائمة</div>
    </div>
    <div class="eyebrow">الدعم</div>
    <h2>قنوات التواصل الرسمية</h2>
    <p class="lede">استخدم أزرار صفحة الإعلان إن أمكن — تساعد على تحديد السيارة بدقة.</p>
    <div class="contact-grid">
      <div class="contact-item"><div class="label">البريد</div><div class="value ltr">rbautoscrap@naver.com</div></div>
      <div class="contact-item"><div class="label">الهاتف / KakaoTalk</div><div class="value ltr">+82 10-5817-2207</div></div>
      <div class="contact-item"><div class="label">WhatsApp</div><div class="value ltr">wa.me · +82 10-5817-2207</div></div>
      <div class="contact-item"><div class="label">Facebook Messenger</div><div class="value ltr">m.me/rbautoscrap</div></div>
      <div class="contact-item"><div class="label">KakaoTalk Open Chat</div><div class="value ltr">open.kakao.com/o/sRRldQFi</div></div>
      <div class="contact-item"><div class="label">ساعات العمل</div><div class="value">الإثنين – الجمعة، 09:00 – 18:00 (KST)</div></div>
    </div>
    <h3 style="font-size: 12.5pt; margin: 7mm 0 2mm;">قائمة المشتري</h3>
    <div class="checklist">
      <div class="check"><i></i><span>إنشاء / اعتماد حساب العضوية</span></div>
      <div class="check"><i></i><span>اختيار وحدات بالصور والفيديو والملاحظات</span></div>
      <div class="check"><i></i><span>تأكيد حالة البيع قبل التفاوض</span></div>
      <div class="check"><i></i><span>إرسال استفسار مع S/N أو رابط الإعلان</span></div>
      <div class="check"><i></i><span>تقديم عرض عضو عند الجاهزية</span></div>
      <div class="check"><i></i><span>الاتفاق على العملة ونوع المستند</span></div>
      <div class="check"><i></i><span>دفع العربون في الموعد المتفق</span></div>
      <div class="check"><i></i><span>ترتيب الشحن بعد التأكيد</span></div>
    </div>
    <div class="callout" style="margin-top: 8mm;"><strong>KOREA AUTO TRADE · RB Auto Co., Ltd.</strong>شكراً لتعاملكم معنا. للشراكات أو برامج الشراء بالجملة راسلوا rbautoscrap@naver.com مع ملف الشركة والأسواق المستهدفة.</div>
    <div class="footer"><span>rbautotrade.com</span><span>ص 7</span></div>
  </section>
`,
  },
];

for (const m of manuals) {
  const html = wrap(m);
  writeFileSync(join(root, "docs", m.file), html, "utf8");
  console.log("wrote", m.file);
}
