const cards = [];
const totalCardsToAdd = 8; // Общее количество карт, которые нужно добавить
const MAX_INTERVAL = 195
const MIN_INTERVAL = 60; // Минимальный интервал в миллисекундах
const SPEED_MULTIPLIER = 0.95; // Множитель скорости для увеличения интервала с количеством карт

function addCard(card) {
    cards.push(card);
    console.log(`Added card: ${card}`);
}

function addSelectedCards(total) {
    let index = 0;
    let interval = MAX_INTERVAL;

    function addNextCard() {
        if (index < total) {
            const card = `card${index + 1}`;
            addCard(card); // Добавляем карту
            index++;

            // Увеличиваем интервал с учетом количества карт
            interval *= SPEED_MULTIPLIER;
            if (interval < MIN_INTERVAL) interval = MIN_INTERVAL
            console.log(`Next card will be added in ${interval.toFixed(2)} ms`);
            setTimeout(addNextCard, interval); // Планируем добавление следующей карты
        }
    }

    addNextCard(); // Запускаем процесс добавления карт
}

// Запускаем функцию
playSelectedCards(totalCardsToAdd);
