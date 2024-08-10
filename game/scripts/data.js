const CARD_POSITIONS = {
	"2 of Hearts": [0,0], "3 of Hearts": [1,0], "4 of Hearts": [2,0], "5 of Hearts": [3,0], "6 of Hearts": [4,0], "7 of Hearts": [5,0],
	"8 of Hearts": [6,0], "9 of Hearts": [7,0], "10 of Hearts": [8,0], "Jack of Hearts": [9,0], "Queen of Hearts": [10,0], "King of Hearts": [11,0],
	"Ace of Hearts": [12,0],

	"2 of Clubs": [0,1], "3 of Clubs": [1,1], "4 of Clubs": [2,1], "5 of Clubs": [3,1], "6 of Clubs": [4,1], "7 of Clubs": [5,1],
	"8 of Clubs": [6,1], "9 of Clubs": [7,1], "10 of Clubs": [8,1], "Jack of Clubs": [9,1], "Queen of Clubs": [10,1], "King of Clubs": [11,1],
	"Ace of Clubs": [12,1],

    "2 of Diamonds": [0,2], "3 of Diamonds": [1,2], "4 of Diamonds": [2,2], "5 of Diamonds": [3,2], "6 of Diamonds": [4,2], "7 of Diamonds": [5,2],
	"8 of Diamonds": [6,2], "9 of Diamonds": [7,2], "10 of Diamonds": [8,2], "Jack of Diamonds": [9,2], "Queen of Diamonds": [10,2], "King of Diamonds": [11,2],
	"Ace of Diamonds": [12,2],

    "2 of Spades": [0,3], "3 of Spades": [1,3], "4 of Spades": [2,3], "5 of Spades": [3,3], "6 of Spades": [4,3], "7 of Spades": [5,3],
	"8 of Spades": [6,3], "9 of Spades": [7,3], "10 of Spades": [8,3], "Jack of Spades": [9,3], "Queen of Spades": [10,3], "King of Spades": [11,3],
	"Ace of Spades": [12,3],
}

const CARD_TYPES_POSITIONS = {
	"Default": [1,0],
	"HiddenRed": [0,0], "HiddenBlue": [0,4], "HiddenYellow": [1,2],
	"HiddenGreen": [2,2], "HiddenBlack": [3,2], "HiddenGradient": [5,2],
	"Galactic": [3,0], "Locked": [4,0], "Stone": [5,0],
	"Gold": [6,0], "Paper": [4,1], "Glass": [5,1],
	"Silver": [6,1]
}

const JOKERS_POSITIONS = {
	"Joker": [0,0], "Textiler": [5,10]
}



let myCards = {
	"6": 0,
	"7": 0,
	"8": 0,
	"9": 0,
	"10": 0,
	"Jack": 0,
	"Queen": 0,
	"King": 0,
	"Ace": 0
}

function resetMyCards() {
	myCards = {
		"6": 0,
		"7": 0,
		"8": 0,
		"9": 0,
		"10": 0,
		"Jack": 0,
		"Queen": 0,
		"King": 0,
		"Ace": 0
	}
}

function addCard(cardValue) {
	myCards[cardValue] += 1;
}