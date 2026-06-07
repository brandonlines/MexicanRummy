// Mexican Rummy hand definitions (10 hands)

export const HANDS = [
  {
    number: 1,
    name: '2 Sets of 3',
    description: 'Two groups of 3 matching cards each',
    points: 30
  },
  {
    number: 2,
    name: '2 Runs of 3',
    description: 'Two sequences of 3 consecutive cards',
    points: 30
  },
  {
    number: 3,
    name: 'Run of 3 + Set of 3',
    description: 'One sequence and one matching group',
    points: 30
  },
  {
    number: 4,
    name: '2 Sets of 4',
    description: 'Two groups of 4 matching cards each',
    points: 40
  },
  {
    number: 5,
    name: '3 Sets of 3',
    description: 'Three groups of 3 matching cards each',
    points: 30
  },
  {
    number: 6,
    name: '2 Runs of 4',
    description: 'Two sequences of 4 consecutive cards',
    points: 40
  },
  {
    number: 7,
    name: '2 Runs of 5',
    description: 'Two sequences of 5 consecutive cards',
    points: 50
  },
  {
    number: 8,
    name: '2 Sets of 5',
    description: 'Two groups of 5 matching cards each',
    points: 50
  },
  {
    number: 9,
    name: 'Run of 5 + Set of 5',
    description: 'One sequence of 5 and one matching group of 5',
    points: 50
  },
  {
    number: 10,
    name: 'Run of 10',
    description: 'One sequence of 10 consecutive cards (or other valid combination)',
    points: 100
  }
];

export function getHandByNumber(number) {
  return HANDS.find(h => h.number === number);
}

export function getAllHands() {
  return HANDS;
}
