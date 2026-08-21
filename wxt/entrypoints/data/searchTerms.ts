// Building blocks for natural-looking Bing queries. Queries are formed as
// "<lead-in> <topic>", "<topic> <tail>", or "<lead-in> <topic> <tail>" so they
// read like real searches a person would make (e.g. "best headphones",
// "gardening for beginners", "cheap laptops on sale") rather than random word
// salad or gibberish strings.
//
// Pool size matters: a query Microsoft has already seen today earns no points,
// so these lists are sized so that even a 90-search day rarely repeats itself.
// Keep every entry lowercase, ASCII, and space-separated — the query tests
// assert that shape.

// Query starters that pair naturally with a noun topic.
export const SEARCH_LEAD_INS: string[] = [
    'best', 'cheapest', 'affordable', 'popular', 'top 10', 'where to buy',
    'reviews of', 'benefits of', 'what is', 'history of', 'ideas for',
    'how much is', 'best budget', 'guide to', 'facts about', 'types of',
    'how to start', 'learning', 'beginner', 'cheap', 'local', 'top rated',
    'comparing', 'best value', 'famous', 'modern', 'classic', 'must try',
    'simple', 'everyday',
];

// Everyday subjects people actually search for.
export const SEARCH_TOPICS: string[] = [
    'coffee', 'espresso', 'pizza', 'sushi', 'tacos', 'ramen', 'breakfast',
    'smoothies', 'pasta', 'sourdough', 'chocolate', 'tea', 'restaurants',
    'bread', 'pancakes', 'curry', 'dumplings', 'barbecue', 'salads', 'soups',
    'desserts', 'ice cream', 'coffee makers', 'air fryers', 'blenders',
    'cookware', 'kitchen knives', 'baking', 'cocktails', 'wine', 'cheese',
    'gardening', 'houseplants', 'succulents', 'herb gardens', 'composting',
    'bonsai', 'orchids', 'gardens', 'interior design', 'recipes', 'meal prep',
    'hiking', 'camping', 'kayaking', 'rock climbing', 'snorkeling',
    'paddleboarding', 'trail running', 'backpacking', 'geocaching', 'archery',
    'running', 'cycling', 'swimming', 'yoga', 'pilates', 'meditation',
    'marathons', 'tennis', 'basketball', 'soccer', 'skiing', 'surfing',
    'bowling', 'badminton', 'table tennis', 'volleyball', 'golf', 'sailing',
    'scuba diving', 'fishing', 'birdwatching',
    'photography', 'painting', 'pottery', 'woodworking', 'knitting', 'origami',
    'watercolour', 'calligraphy', 'sketching', 'sewing', 'quilting',
    'jewellery making', 'candle making', 'model trains',
    'guitar', 'piano', 'violin', 'drums', 'ukulele', 'singing', 'songwriting',
    'music theory', 'chess', 'board games', 'video games', 'puzzles',
    'crossword puzzles', 'sudoku', 'trivia', 'magic tricks',
    'movies', 'documentaries', 'podcasts', 'audiobooks', 'novels', 'comics',
    'astronomy', 'physics', 'biology', 'geography', 'history', 'languages',
    'budgeting', 'investing', 'productivity', 'nutrition', 'sleep', 'stretching',
    'public speaking', 'note taking', 'journaling', 'time management',
    'habit tracking', 'resume writing', 'tidying',
    'dogs', 'cats', 'aquariums', 'road trips', 'national parks', 'beaches',
    'mountains', 'waterfalls', 'museums', 'art galleries', 'concerts',
    'festivals', 'budget travel', 'city breaks', 'train travel',
    'laptops', 'headphones', 'smartphones', 'cameras', 'keyboards', 'monitors',
    'standing desks', 'electric cars', 'solar panels', 'smart home', 'bicycles',
];

// Suffixes that pair naturally with a noun topic.
export const SEARCH_TAILS: string[] = [
    'near me', 'for beginners', 'reviews', 'ideas', 'tips', 'prices',
    'on a budget', 'explained', 'guide', 'deals', 'this weekend', 'at home',
    'for kids', 'checklist', 'basics', 'trends', 'for two', 'in winter',
    'in summer', 'step by step', 'comparison', 'alternatives', 'for families',
    'for students', 'on sale', 'made easy', 'buying guide', 'recommendations',
    'for small spaces', 'essentials',
];
