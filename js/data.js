// Product data for saba-dy soap store
const products = [
    {
        id: 1,
        name: "Мыло 'Лаванда и мед'",
        description: "Нежное мыло с экстрактом лаванды и натуральным медом. Обладает успокаивающим и антисептическим действием.",
        composition: "Оливковое масло, кокосовое масло, лавандовое масло, натуральный мед, луговой мед.",
        usage: "Нанести на влажную кожу, вспенить, смыть теплой водой. Подходит для ежедневного использования.",
        price: 350,
        image: "🧼",
        inStock: true
    },
    {
        id: 2,
        name: "Мыло 'Роза и молоко'",
        description: "Кремовое мыло с розовым маслом и молочными протеинами. Идеально для чувствительной кожи.",
        composition: "Масло ши, миндальное масло, розовое масло, молочные протеины, глицерин.",
        usage: "Массирующими движениями нанести на кожу, наслаждаться ароматом, смыть водой.",
        price: 420,
        image: "🌹",
        inStock: true
    }
];

// Delivery options
const deliveryOptions = [
    {
        id: 'pickup',
        name: 'Самовывоз',
        description: 'Бесплатно, по предварительной договоренности',
        price: 0
    },
    {
        id: 'courier',
        name: 'Курьер',
        description: 'Доставка по городу от 300₽',
        price: 300
    },
    {
        id: 'cdek',
        name: 'СДЭК',
        description: 'От 350₽, срок 2-5 дней',
        price: 350
    },
    {
        id: 'ozon',
        name: 'Ozon',
        description: 'От 300₽, срок 2-5 дней',
        price: 300
    }
];

// Payment methods (single option: YooKassa)
const paymentMethods = [
    {
        id: 'yookassa',
        name: 'ЮKassa',
        description: 'Онлайн-оплата: банковские карты, СБП, кошельки'
    }
];

// Contact information
const contactInfo = {
    phone: '+7 (964) 064-27-28',
    email: 'muskhab.dakayev@mail.ru',
    address: 'г. Аргун, ул. Мани-Шейха, д. 10',
    workingHours: 'Пн-Вс: 9:00-21:00'
};

// Store information
const storeInfo = {
    name: 'saba-dy',
    description: 'Натуральное мыло ручной работы',
    owner: 'ИП Иванов И.И.',
    inn: 'XXXXXXXXXXXX',
    ogrnip: 'XXXXXXXXXXXXXXXXXXX'
};

// Export data for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        products,
        deliveryOptions,
        paymentMethods,
        contactInfo,
        storeInfo
    };
}
