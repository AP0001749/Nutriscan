// src/lib/food-data.ts
import { FoodItem } from './types';

// The Sovereign Database: The single source of truth for food composition.
export const foodDatabase: FoodItem[] = [
  {
    name: 'Sushi',
    ingredients: ['Sushi Rice', 'Nori', 'Tuna', 'Salmon', 'Avocado', 'Cucumber'],
    keywords: ['sushi', 'maki', 'nigiri', 'japanese', 'fish', 'rice'],
  },
  {
    name: 'Almond Tart',
    ingredients: ['Almond', 'Tart Shell', 'Butter', 'Sugar', 'Egg'],
    keywords: ['almond', 'tart', 'torte', 'pastry', 'dessert', 'bakewell', 'nut'],
  },
  {
    name: 'Red Onion',
    ingredients: ['Red Onion'],
    keywords: ['onion', 'red onion', 'vegetable', 'allium'],
  },
  {
    name: 'Caliburrito',
    ingredients: ['Flour Tortilla', 'Chicken', 'White Rice', 'Black Beans', 'Cheese', 'Sour Cream', 'Guacamole', 'Salsa'],
    keywords: ['burrito', 'mexican', 'wrap', 'caliburrito', 'chicken'],
  },
  {
    name: 'Cookies and Cream Ice Cream',
    ingredients: ['Ice Cream', 'Oreo Cookie'],
    keywords: ['ice cream', 'dessert', 'oreo', 'cookies and cream', 'cookie'],
  },
  {
    name: 'Barramundi Fillet',
    ingredients: ['Barramundi Fish', 'Lemon', 'Herbs'],
    keywords: ['fish', 'barramundi', 'seafood', 'fillet', 'lemon'],
  },
  {
    name: 'Rasmalai Cake',
    ingredients: ['Rasmalai', 'Cake', 'Pistachio', 'Saffron', 'Milk'],
    keywords: ['dessert', 'cake', 'indian', 'rasmalai', 'pistachio'],
  },
  {
    name: 'Pizza',
    ingredients: ['Pizza Dough', 'Tomato Sauce', 'Cheese', 'Pepperoni'],
    keywords: ['pizza', 'pepperoni', 'cheese', 'italian'],
  },
  {
    name: 'Caesar Salad',
    ingredients: ['Lettuce', 'Croutons', 'Parmesan Cheese', 'Caesar Dressing'],
    keywords: ['salad', 'caesar salad', 'lettuce', 'croutons'],
  }
];