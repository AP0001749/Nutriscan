// src/lib/food-data.ts
import { FoodItem } from './types';

// The Sovereign Database: The single source of truth for food composition.
export const foodDatabase: FoodItem[] = [
  {
    name: 'Sushi',
    ingredients: ['Sushi Rice', 'Nori', 'Tuna', 'Salmon', 'Avocado', 'Cucumber'],
    keywords: ['sushi', 'maki', 'nigiri', 'japanese', 'fish', 'rice', 'roll'],
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
    ingredients: ['Pizza Dough', 'Tomato Sauce', 'Mozzarella Cheese', 'Pepperoni'],
    keywords: ['pizza', 'pepperoni', 'cheese', 'italian', 'pie'],
  },
  {
    name: 'Caesar Salad',
    ingredients: ['Lettuce', 'Croutons', 'Parmesan Cheese', 'Caesar Dressing'],
    keywords: ['salad', 'caesar salad', 'lettuce', 'croutons', 'romaine'],
  },
  // Common foods for better accuracy
  {
    name: 'Hamburger',
    ingredients: ['Ground Beef', 'Bun', 'Lettuce', 'Tomato', 'Cheese', 'Pickles'],
    keywords: ['burger', 'hamburger', 'beef', 'cheeseburger', 'patty'],
  },
  {
    name: 'French Fries',
    ingredients: ['Potato', 'Oil', 'Salt'],
    keywords: ['fries', 'french fries', 'potato', 'chips', 'fried'],
  },
  {
    name: 'Fried Chicken',
    ingredients: ['Chicken', 'Breading', 'Oil'],
    keywords: ['chicken', 'fried chicken', 'drumstick', 'wing', 'breast'],
  },
  {
    name: 'Pasta with Marinara',
    ingredients: ['Pasta', 'Tomato Sauce', 'Garlic', 'Olive Oil', 'Basil'],
    keywords: ['pasta', 'spaghetti', 'marinara', 'tomato', 'italian', 'noodles'],
  },
  {
    name: 'Chocolate Cake',
    ingredients: ['Flour', 'Cocoa Powder', 'Sugar', 'Butter', 'Eggs'],
    keywords: ['cake', 'chocolate', 'dessert', 'brownie', 'cocoa'],
  },
  {
    name: 'Apple',
    ingredients: ['Apple'],
    keywords: ['apple', 'fruit', 'fresh'],
  },
  {
    name: 'Banana',
    ingredients: ['Banana'],
    keywords: ['banana', 'fruit', 'fresh'],
  },
  {
    name: 'Orange',
    ingredients: ['Orange'],
    keywords: ['orange', 'citrus', 'fruit', 'fresh'],
  },
  {
    name: 'Grilled Chicken Breast',
    ingredients: ['Chicken Breast', 'Olive Oil', 'Herbs'],
    keywords: ['chicken', 'grilled', 'breast', 'poultry', 'lean'],
  },
  {
    name: 'Steak',
    ingredients: ['Beef Steak', 'Salt', 'Pepper'],
    keywords: ['steak', 'beef', 'meat', 'ribeye', 'sirloin', 'filet'],
  },
  {
    name: 'Salmon Fillet',
    ingredients: ['Salmon', 'Lemon', 'Dill'],
    keywords: ['salmon', 'fish', 'seafood', 'fillet', 'omega'],
  },
  {
    name: 'Egg Omelette',
    ingredients: ['Eggs', 'Milk', 'Cheese', 'Vegetables'],
    keywords: ['egg', 'omelette', 'omelet', 'breakfast', 'scrambled'],
  },
  {
    name: 'Avocado Toast',
    ingredients: ['Bread', 'Avocado', 'Salt', 'Pepper'],
    keywords: ['avocado', 'toast', 'bread', 'breakfast', 'brunch'],
  },
  {
    name: 'Greek Yogurt',
    ingredients: ['Greek Yogurt'],
    keywords: ['yogurt', 'greek', 'dairy', 'protein', 'yoghurt'],
  },
  {
    name: 'Smoothie Bowl',
    ingredients: ['Banana', 'Berries', 'Yogurt', 'Granola'],
    keywords: ['smoothie', 'bowl', 'acai', 'berries', 'breakfast'],
  },
  {
    name: 'Tacos',
    ingredients: ['Tortilla', 'Ground Beef', 'Lettuce', 'Cheese', 'Salsa'],
    keywords: ['taco', 'mexican', 'tortilla', 'beef', 'shell'],
  },
  {
    name: 'Pad Thai',
    ingredients: ['Rice Noodles', 'Shrimp', 'Peanuts', 'Bean Sprouts', 'Lime'],
    keywords: ['pad thai', 'thai', 'noodles', 'asian', 'shrimp'],
  },
  {
    name: 'Fried Rice',
    ingredients: ['Rice', 'Egg', 'Vegetables', 'Soy Sauce'],
    keywords: ['fried rice', 'rice', 'chinese', 'asian', 'egg'],
  },
  {
    name: 'Ramen',
    ingredients: ['Noodles', 'Broth', 'Pork', 'Egg', 'Scallions'],
    keywords: ['ramen', 'noodles', 'japanese', 'soup', 'broth'],
  },
  {
    name: 'Pho',
    ingredients: ['Rice Noodles', 'Beef Broth', 'Beef', 'Herbs', 'Lime'],
    keywords: ['pho', 'vietnamese', 'soup', 'noodles', 'broth'],
  },
  {
    name: 'Biryani',
    ingredients: ['Rice', 'Chicken', 'Spices', 'Yogurt', 'Onions'],
    keywords: ['biryani', 'rice', 'indian', 'chicken', 'curry'],
  },
  {
    name: 'Sandwich',
    ingredients: ['Bread', 'Turkey', 'Cheese', 'Lettuce', 'Tomato'],
    keywords: ['sandwich', 'sub', 'deli', 'bread', 'turkey'],
  },
  {
    name: 'Donut',
    ingredients: ['Flour', 'Sugar', 'Yeast', 'Oil', 'Glaze'],
    keywords: ['donut', 'doughnut', 'pastry', 'dessert', 'glazed'],
  },
  {
    name: 'Pancakes',
    ingredients: ['Flour', 'Milk', 'Eggs', 'Butter', 'Maple Syrup'],
    keywords: ['pancake', 'breakfast', 'syrup', 'hotcake', 'flapjack'],
  },
  {
    name: 'Waffles',
    ingredients: ['Flour', 'Milk', 'Eggs', 'Butter'],
    keywords: ['waffle', 'breakfast', 'syrup', 'belgian'],
  },
  {
    name: 'Bagel with Cream Cheese',
    ingredients: ['Bagel', 'Cream Cheese'],
    keywords: ['bagel', 'cream cheese', 'breakfast', 'bread'],
  },
  {
    name: 'Croissant',
    ingredients: ['Flour', 'Butter', 'Yeast'],
    keywords: ['croissant', 'pastry', 'french', 'breakfast', 'bakery'],
  },
  {
    name: 'Muffin',
    ingredients: ['Flour', 'Sugar', 'Eggs', 'Blueberries'],
    keywords: ['muffin', 'blueberry', 'bakery', 'breakfast', 'cake'],
  },
  {
    name: 'Coffee',
    ingredients: ['Coffee Beans', 'Water'],
    keywords: ['coffee', 'espresso', 'latte', 'cappuccino', 'caffeine'],
  },
];