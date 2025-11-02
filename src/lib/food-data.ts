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
    name: 'Chicken Biryani',
    ingredients: ['Basmati Rice', 'Chicken', 'Yogurt', 'Onions', 'Ginger', 'Garlic', 'Biryani Spices', 'Saffron'],
    keywords: ['biryani', 'chicken biryani', 'rice', 'indian', 'chicken', 'spiced rice', 'hyderabadi'],
  },
  {
    name: 'Mutton Biryani',
    ingredients: ['Basmati Rice', 'Mutton', 'Yogurt', 'Onions', 'Ginger', 'Garlic', 'Biryani Spices', 'Saffron'],
    keywords: ['biryani', 'mutton biryani', 'lamb biryani', 'rice', 'indian', 'mutton', 'lamb'],
  },
  {
    name: 'Vegetable Biryani',
    ingredients: ['Basmati Rice', 'Mixed Vegetables', 'Yogurt', 'Onions', 'Biryani Spices', 'Cashews'],
    keywords: ['biryani', 'veg biryani', 'vegetable biryani', 'rice', 'indian', 'vegetarian'],
  },
  {
    name: 'Chicken Curry',
    ingredients: ['Chicken', 'Onions', 'Tomatoes', 'Curry Spices', 'Coconut Milk', 'Ginger', 'Garlic'],
    keywords: ['curry', 'chicken curry', 'indian', 'gravy', 'masala', 'tikka masala'],
  },
  {
    name: 'Butter Chicken',
    ingredients: ['Chicken', 'Butter', 'Cream', 'Tomato Sauce', 'Curry Spices', 'Fenugreek'],
    keywords: ['butter chicken', 'murgh makhani', 'indian', 'curry', 'creamy', 'tikka'],
  },
  {
    name: 'Palak Paneer',
    ingredients: ['Spinach', 'Paneer Cheese', 'Onions', 'Tomatoes', 'Cream', 'Spices'],
    keywords: ['palak paneer', 'spinach', 'paneer', 'indian', 'curry', 'vegetarian'],
  },
  {
    name: 'Dal Tadka',
    ingredients: ['Lentils', 'Onions', 'Tomatoes', 'Ghee', 'Cumin', 'Garlic', 'Spices'],
    keywords: ['dal', 'lentils', 'indian', 'daal', 'tadka', 'vegetarian'],
  },
  {
    name: 'Chicken Stir Fry',
    ingredients: ['Chicken', 'Bell Peppers', 'Onions', 'Broccoli', 'Soy Sauce', 'Garlic', 'Ginger'],
    keywords: ['stir fry', 'chicken', 'chinese', 'vegetables', 'wok', 'asian'],
  },
  {
    name: 'Beef Stir Fry',
    ingredients: ['Beef', 'Bell Peppers', 'Onions', 'Broccoli', 'Soy Sauce', 'Garlic', 'Ginger'],
    keywords: ['stir fry', 'beef', 'chinese', 'vegetables', 'wok', 'asian'],
  },
  {
    name: 'Veggie Stir Fry',
    ingredients: ['Bell Peppers', 'Broccoli', 'Carrots', 'Mushrooms', 'Soy Sauce', 'Garlic', 'Ginger'],
    keywords: ['stir fry', 'vegetable', 'chinese', 'vegetables', 'wok', 'asian', 'veggie'],
  },
  {
    name: 'Chow Mein',
    ingredients: ['Noodles', 'Chicken', 'Cabbage', 'Carrots', 'Bean Sprouts', 'Soy Sauce'],
    keywords: ['chow mein', 'noodles', 'chinese', 'asian', 'chicken', 'lo mein'],
  },
  {
    name: 'Spring Rolls',
    ingredients: ['Rice Paper', 'Shrimp', 'Vegetables', 'Noodles', 'Herbs'],
    keywords: ['spring roll', 'roll', 'vietnamese', 'asian', 'fresh', 'wrapper'],
  },
  {
    name: 'Egg Fried Rice',
    ingredients: ['Rice', 'Eggs', 'Peas', 'Carrots', 'Soy Sauce', 'Scallions'],
    keywords: ['fried rice', 'egg fried rice', 'rice', 'chinese', 'asian', 'egg'],
  },
  {
    name: 'Beef Tacos',
    ingredients: ['Tortilla', 'Ground Beef', 'Lettuce', 'Cheese', 'Salsa', 'Sour Cream'],
    keywords: ['taco', 'beef taco', 'mexican', 'tortilla', 'beef', 'shell'],
  },
  {
    name: 'Chicken Tacos',
    ingredients: ['Tortilla', 'Chicken', 'Lettuce', 'Cheese', 'Salsa', 'Sour Cream'],
    keywords: ['taco', 'chicken taco', 'mexican', 'tortilla', 'chicken', 'shell'],
  },
  {
    name: 'Fish Tacos',
    ingredients: ['Tortilla', 'White Fish', 'Cabbage', 'Lime', 'Cilantro', 'Crema'],
    keywords: ['taco', 'fish taco', 'mexican', 'tortilla', 'fish', 'seafood'],
  },
  {
    name: 'Quesadilla',
    ingredients: ['Tortilla', 'Cheese', 'Chicken', 'Bell Peppers', 'Onions'],
    keywords: ['quesadilla', 'mexican', 'tortilla', 'cheese', 'chicken'],
  },
  {
    name: 'Enchiladas',
    ingredients: ['Tortilla', 'Chicken', 'Cheese', 'Enchilada Sauce', 'Sour Cream'],
    keywords: ['enchilada', 'mexican', 'tortilla', 'cheese', 'sauce'],
  },
  {
    name: 'Nachos',
    ingredients: ['Tortilla Chips', 'Cheese', 'Jalapenos', 'Sour Cream', 'Guacamole', 'Salsa'],
    keywords: ['nachos', 'chips', 'mexican', 'cheese', 'snack'],
  },
  {
    name: 'Fajitas',
    ingredients: ['Tortilla', 'Chicken', 'Bell Peppers', 'Onions', 'Sour Cream', 'Guacamole'],
    keywords: ['fajita', 'mexican', 'chicken', 'peppers', 'tortilla'],
  },
  {
    name: 'Lasagna',
    ingredients: ['Pasta', 'Ground Beef', 'Ricotta Cheese', 'Mozzarella', 'Tomato Sauce'],
    keywords: ['lasagna', 'pasta', 'italian', 'cheese', 'beef', 'baked'],
  },
  {
    name: 'Spaghetti Carbonara',
    ingredients: ['Spaghetti', 'Bacon', 'Eggs', 'Parmesan Cheese', 'Black Pepper'],
    keywords: ['carbonara', 'spaghetti', 'pasta', 'italian', 'bacon', 'creamy'],
  },
  {
    name: 'Fettuccine Alfredo',
    ingredients: ['Fettuccine', 'Butter', 'Cream', 'Parmesan Cheese', 'Garlic'],
    keywords: ['alfredo', 'fettuccine', 'pasta', 'italian', 'cream', 'cheese'],
  },
  {
    name: 'Chicken Parmesan',
    ingredients: ['Chicken Breast', 'Breading', 'Mozzarella Cheese', 'Tomato Sauce', 'Parmesan'],
    keywords: ['chicken parmesan', 'chicken parm', 'italian', 'breaded', 'cheese'],
  },
  {
    name: 'Margherita Pizza',
    ingredients: ['Pizza Dough', 'Tomato Sauce', 'Mozzarella', 'Basil', 'Olive Oil'],
    keywords: ['pizza', 'margherita', 'cheese', 'italian', 'tomato', 'basil'],
  },
  {
    name: 'Pepperoni Pizza',
    ingredients: ['Pizza Dough', 'Tomato Sauce', 'Mozzarella', 'Pepperoni'],
    keywords: ['pizza', 'pepperoni', 'cheese', 'italian', 'meat'],
  },
  {
    name: 'BBQ Chicken Pizza',
    ingredients: ['Pizza Dough', 'BBQ Sauce', 'Chicken', 'Red Onions', 'Mozzarella'],
    keywords: ['pizza', 'bbq', 'chicken', 'barbecue', 'cheese'],
  },
  {
    name: 'Veggie Pizza',
    ingredients: ['Pizza Dough', 'Tomato Sauce', 'Mozzarella', 'Bell Peppers', 'Mushrooms', 'Onions'],
    keywords: ['pizza', 'vegetable', 'veggie', 'cheese', 'peppers'],
  },
  {
    name: 'Sushi Roll',
    ingredients: ['Sushi Rice', 'Nori', 'Tuna', 'Salmon', 'Avocado', 'Cucumber'],
    keywords: ['sushi', 'maki', 'roll', 'japanese', 'fish', 'rice', 'seaweed'],
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