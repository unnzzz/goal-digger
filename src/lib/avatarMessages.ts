// Playful avatar messages for different actions
export const AVATAR_MESSAGES = {
  // Goal actions
  goalCreated: [
    "Ooh, another goal? You're really testing my patience! 😤 Just kidding, I love it! 🎯",
    "Another goal? Fine, I'll help you... but only because I'm nice! 😏✨",
    "Oh great, more work for me! 😅 Just kidding, let's crush this together! 💪",
    "You're really making me work hard today! But I guess I can handle one more goal... 🎯"
  ],
  
  goalStarted: [
    "Finally! I was getting bored waiting! Let's do this! 🚀",
    "About time! I was starting to think you'd chicken out! 😏💪",
    "YES! Now we're talking! Time to show this goal who's boss! 🔥",
    "Finally some action! I was getting tired of just sitting here! ⚡"
  ],
  
  goalCompleted: [
    "NO WAY! You actually did it! I'm... impressed! 😱🏆",
    "Wait, you finished? I didn't see that coming! You're not half bad! 🤯",
    "Okay okay, I admit it... you're pretty awesome! 🏆✨",
    "I'm speechless! You actually did it! I'm so proud! 😭💫"
  ],

  // Quest actions
  questCompleted: [
    "Ooh, look who's being productive! I like it! ⭐",
    "Another one bites the dust! You're on fire! 🔥",
    "Well well, someone's actually doing their homework! 💪",
    "I see what you did there! Sneaky! I approve! 😏✨"
  ],

  // Room actions
  roomDecorated: [
    "Ooh, someone's been busy! My room looks... actually pretty good! 🏠✨",
    "Wait, you decorated MY room? I didn't ask for this... but I love it! 😍",
    "Okay, I'll admit it... you have better taste than I expected! 🎨",
    "My room is looking fancy! Are you trying to impress me? 😏💕"
  ],

  roomSaved: [
    "Room saved! Now it's officially MINE! No take-backs! 🏡✨",
    "Perfect! My room is locked and loaded! Thanks for the help! 😊",
    "Room officially saved! I'm keeping this layout forever! 🌟",
    "Saved! My room is now exactly how I like it! You did good! 💕"
  ],

  // Shop actions
  shopVisited: [
    "Shopping time! Finally, something I'm good at! 🛍️",
    "Ooh, let's see what shiny things we can find! 👀",
    "Shopping? I thought you'd never ask! My favorite activity! 🤔",
    "Time to spend your hard-earned coins! I'm here for it! 💰"
  ],

  furnitureBought: [
    "Ooh, new furniture! I hope it's not ugly! 🪑",
    "You bought me something? I'm... touched! 😊",
    "New furniture! I better like it or I'm complaining! 🎉",
    "You're spoiling me! I could get used to this! 💖"
  ],

  // Page navigation
  generatorVisited: [
    "Oh, planning time? I hope you're not going to waste my time! 🗺️",
    "I know it takes time to generate a roadmap, but it's worth it! 🚀",
    "A few more minutes , I promise! 🚀",
    "Another roadmap? Fine, but make it good! ✨",
    "Let's create something that won't embarrass me! 🎯",
    "Planning? I'm here for it! Just don't mess it up! 🚀"
  ],

  dashboardVisited: [
    "Back to check on your progress? I was getting lonely! 📊",
    "Let's see if you've been slacking off! 📈",
    "Dashboard time! I hope you've been productive! 🌟",
    "Welcome back! I was wondering when you'd show up! 💪"
  ],

  roomVisited: [
    "Welcome to MY room! Don't touch anything! 🏠",
    "This is my space! Be respectful! 🎨",
    "My room, my rules! But you can help decorate! ✨",
    "Time to make my room even more amazing! You're helping! 🏡"
  ],


  diaryVisited: [
    "Diary time! I hope you're writing nice things about me! 📖",
    "Let's capture today's memories! Don't forget to mention me! ✍️",
    "Your diary better be interesting! I'm reading it! 💎",
    "Writing time! I love being part of your story! 🤔"
  ],

  // Motivational messages
  encouragement: [
    "You're not terrible! Keep going! 💪",
    "I guess I believe in you... maybe! ✨",
    "You're making progress! I'm... surprised! 🌟",
    "Don't give up! I'm stuck with you anyway! 🚀",
    "You're doing okay! I'm... impressed! 🎉"
  ],

  // Quest reminders
  questReminder: [
    "Don't forget your quests! I need new furniture! 🪑",
    "Complete your quests so you can buy me things! 💰",
    "I'm waiting for new furniture! Get to work! ⏰",
    "More quests = more coins = more stuff for me! 🎯"
  ]
};

// Function to get a random message from a category
export function getRandomMessage(category: keyof typeof AVATAR_MESSAGES): string {
  const messages = AVATAR_MESSAGES[category];
  return messages[Math.floor(Math.random() * messages.length)];
}

// Function to get a message based on action
export function getMessageForAction(action: string, context?: any): string {
  switch (action) {
    case 'goal_created':
      return getRandomMessage('goalCreated');
    case 'goal_started':
      return getRandomMessage('goalStarted');
    case 'goal_completed':
      return getRandomMessage('goalCompleted');
    case 'quest_completed':
      return getRandomMessage('questCompleted');
    case 'room_decorated':
      return getRandomMessage('roomDecorated');
    case 'room_saved':
      return getRandomMessage('roomSaved');
    case 'furniture_bought':
      return getRandomMessage('furnitureBought');
    case 'dashboard_visited':
      return getRandomMessage('dashboardVisited');
    case 'room_visited':
      return getRandomMessage('roomVisited');
    case 'shop_visited':
      return getRandomMessage('shopVisited');
    case 'diary_visited':
      return getRandomMessage('diaryVisited');
    case 'generator_visited':
      return getRandomMessage('generatorVisited');
    case 'quest_reminder':
      return getRandomMessage('questReminder');
    default:
      return getRandomMessage('encouragement');
  }
}
