import turDalImage from "@/assets/products/Tur dal.png";
import chanaDalImage from "@/assets/products/Chana dal.png";
import moogWholeImage from "@/assets/products/Moog whole.png";
import moogMogarImage from "@/assets/products/Moog daal mohar.png";
import moogChilkaImage from "@/assets/products/Moog daal chika.png";
import udidWholeImage from "@/assets/products/Udid Whole.png";
import udidPlainImage from "@/assets/products/udid dal plain.png";
import udidChilkaImage from "@/assets/products/udid dal chika.png";
import pavtaImage from "@/assets/products/pavta indian bean.png";
import strawberryImage from "@/assets/products/strawberry.png";
import strawberryJamImage from "@/assets/products/strawberry jam.png";
import cowGheeImage from "@/assets/products/Cow Ghee.png";
import honeyImage from "@/assets/products/honey.png";
import rajmaImage from "@/assets/products/15.png";
import turmericImage from "@/assets/products/Turmeric.png";
import nachaniImage from "@/assets/products/nachni (2).png";
import jawarImage from "@/assets/products/jower.png";
import jaggeryBlockImage from "@/assets/products/Jaggery Blocks.png";
import jaggeryCubesImage from "@/assets/products/16.png";
import jaggeryPowderImage from "@/assets/products/JAggery Powder.png";
import gomutraImage from "@/assets/products/gomutra.png";
import dhoopImage from "@/assets/products/dhup.png";
import diyaImage from "@/assets/products/Cowdung Diya.png";
import cakeImage from "@/assets/products/Cowdung cake.png";
import blogOneImage from "@/assets/blog-1.png";

export const products = [
  {
    id: 1,
    name: "Tur Dal",
    price: 65,
    image: turDalImage,
    category: "Grains & Pulses",
    unit: "250gm",
    hsnCode: "7136000",
    variants: [
      { label: "250gm", price: 65 },
      { label: "500gm", price: 125 },
      { label: "1kg", price: 250 },
    ],
  },
  {
    id: 2,
    name: "Chana Dal",
    price: 48,
    image: chanaDalImage,
    category: "Grains & Pulses",
    unit: "250gm",
    hsnCode: "7132000",
    variants: [
      { label: "250gm", price: 48 },
      { label: "500gm", price: 90 },
      { label: "1kg", price: 180 },
    ],
  },
  {
    id: 3,
    name: "Moog (Whole)",
    price: 55,
    image: moogWholeImage,
    category: "Grains & Pulses",
    unit: "250gm",
    hsnCode: "7133100",
    variants: [
      { label: "250gm", price: 55 },
      { label: "500gm", price: 100 },
      { label: "1kg", price: 200 },
    ],
  },
  {
    id: 4,
    name: "Moog Dal Mogar",
    price: 60,
    image: moogMogarImage,
    category: "Grains & Pulses",
    unit: "250gm",
    hsnCode: "7133100",
    variants: [
      { label: "250gm", price: 60 },
      { label: "500gm", price: 115 },
      { label: "1kg", price: 230 },
    ],
  },
  {
    id: 5,
    name: "Moog Dal Chilka",
    price: 60,
    image: moogChilkaImage,
    category: "Grains & Pulses",
    unit: "250gm",
    hsnCode: "7133390",
    variants: [
      { label: "250gm", price: 60 },
      { label: "500gm", price: 110 },
      { label: "1kg", price: 220 },
    ],
  },
  {
    id: 6,
    name: "Udid (Whole)",
    price: 55,
    image: udidWholeImage,
    category: "Grains & Pulses",
    unit: "250gm",
    hsnCode: "7133110",
    variants: [
      { label: "250gm", price: 55 },
      { label: "500gm", price: 100 },
      { label: "1kg", price: 200 },
    ],
  },
  {
    id: 7,
    name: "Udid Dal Plain",
    price: 65,
    image: udidPlainImage,
    category: "Grains & Pulses",
    unit: "250gm",
    hsnCode: "7133100",
    variants: [
      { label: "250gm", price: 65 },
      { label: "500gm", price: 120 },
      { label: "1kg", price: 240 },
    ],
  },
  {
    id: 8,
    name: "Udid Dal Chilka",
    price: 58,
    image: udidChilkaImage,
    category: "Grains & Pulses",
    unit: "250gm",
    hsnCode: "7133390",
    variants: [
      { label: "250gm", price: 58 },
      { label: "500gm", price: 110 },
      { label: "1kg", price: 220 },
    ],
  },
  {
    id: 9,
    name: "Pavta / Indian Bean",
    price: 55,
    image: pavtaImage,
    category: "Grains & Pulses",
    unit: "250gm",
    hsnCode: "7082000",
    variants: [
      { label: "250gm", price: 55 },
      { label: "500gm", price: 105 },
      { label: "1kg", price: 210 },
    ],
  },
  {
    id: 10,
    name: "Organic Strawberry (Winter Down)",
    price: 100,
    image: strawberryImage,
    category: "Fresh Fruits",
    unit: "200gm",
    hsnCode: "8101000",
    variants: [
      { label: "200gm", price: 100 },
      { label: "500gm", price: 250 },
    ],
  },
  {
    id: 11,
    name: "Strawberry Jam",
    price: 150,
    image: strawberryJamImage,
    category: "Natural Sweetness",
    unit: "250gm",
    hsnCode: "20079990",
    variants: [{ label: "250gm", price: 150 }],
  },
  {
    id: 12,
    name: "Desi Gir Cow Ghee",
    price: 350,
    image: cowGheeImage,
    category: "Dairy Products",
    unit: "100gm",
    hsnCode: "4059020",
    variants: [
      { label: "100gm", price: 350 },
      { label: "250gm", price: 800 },
      { label: "500gm", price: 1500 },
      { label: "1kg", price: 3000 },
    ],
  },
  {
    id: 13,
    name: "Raw Honey",
    price: 90,
    image: honeyImage,
    category: "Natural Sweetness",
    unit: "100gm",
    hsnCode: "7133300",
    variants: [
      { label: "100gm", price: 90 },
      { label: "250gm", price: 220 },
      { label: "500gm", price: 425 },
      { label: "1kg", price: 850 },
    ],
  },
  {
    id: 14,
    name: "Rajma / Ghewda",
    price: 55,
    image: rajmaImage,
    category: "Grains & Pulses",
    unit: "250gm",
    hsnCode: "7133300",
    variants: [
      { label: "250gm", price: 55 },
      { label: "500gm", price: 110 },
      { label: "1kg", price: 220 },
    ],
  },
  {
    id: 15,
    name: "Turmeric",
    price: 135,
    image: turmericImage,
    category: "Spices & Condiments",
    unit: "250gm",
    hsnCode: "9103020",
    variants: [
      { label: "250gm", price: 135 },
      { label: "500gm", price: 250 },
      { label: "1kg", price: 500 },
    ],
  },
  {
    id: 16,
    name: "Nachani / Finger Millet",
    price: 35,
    image: nachaniImage,
    category: "Grains & Pulses",
    unit: "250gm",
    hsnCode: "10082930",
    variants: [
      { label: "250gm", price: 35 },
      { label: "500gm", price: 60 },
      { label: "1kg", price: 120 },
    ],
  },
  {
    id: 17,
    name: "Jawar",
    price: 32,
    image: jawarImage,
    category: "Grains & Pulses",
    unit: "250gm",
    hsnCode: "10082110",
    variants: [
      { label: "250gm", price: 32 },
      { label: "500gm", price: 60 },
      { label: "1kg", price: 120 },
    ],
  },
  {
    id: 18,
    name: "Jaggery Block",
    price: 135,
    image: jaggeryBlockImage,
    category: "Natural Sweetness",
    unit: "1kg",
    hsnCode: "17011310",
    variants: [{ label: "1kg", price: 135 }],
  },
  {
    id: 19,
    name: "Jaggery Cubes",
    price: 150,
    image: jaggeryCubesImage,
    category: "Natural Sweetness",
    unit: "1kg",
    hsnCode: "17011310",
    variants: [{ label: "1kg", price: 150 }],
  },
  {
    id: 20,
    name: "Jaggery Powder",
    price: 220,
    image: jaggeryPowderImage,
    category: "Natural Sweetness",
    unit: "1kg",
    hsnCode: "17011310",
    variants: [{ label: "1kg", price: 220 }],
  },
  {
    id: 21,
    name: "Gaumutra",
    price: 175,
    image: gomutraImage,
    category: "Gau Seva Sacred Products",
    unit: "500ml",
    hsnCode: "30049011",
    variants: [
      { label: "500ml", price: 175 },
      { label: "1lit", price: 350 },
    ],
  },
  {
    id: 22,
    name: "Cowdung Dhup",
    price: 50,
    image: dhoopImage,
    category: "Gau Seva Sacred Products",
    unit: "10 pieces",
    hsnCode: "33074100",
    variants: [
      { label: "10", price: 50 },
      { label: "20", price: 100 },
      { label: "50", price: 220 },
    ],
  },
  {
    id: 23,
    name: "Cowdung Diya",
    price: 80,
    image: diyaImage,
    category: "Gau Seva Sacred Products",
    unit: "10 pieces",
    hsnCode: "31010099",
    variants: [
      { label: "10", price: 80 },
      { label: "50", price: 400 },
      { label: "100", price: 800 },
    ],
  },
  {
    id: 24,
    name: "Cowdung Cake",
    price: 60,
    image: cakeImage,
    category: "Gau Seva Sacred Products",
    unit: "10 pieces",
    hsnCode: "31010092",
    variants: [
      { label: "10", price: 60 },
      { label: "50", price: 300 },
      { label: "100", price: 600 },
    ],
  },
  {
    id: 25,
    name: "Payment Test Product",
    price: 1,
    image: honeyImage,
    category: "Natural Sweetness",
    unit: "1pc",
    hsnCode: "21069099",
    variants: [{ label: "1pc", price: 1 }],
  },
];

export const categories = [
  "All",
  "Grains & Pulses",
  "Dairy Products",
  "Fresh Fruits",
  "Gau Seva Sacred Products",
  "Natural Sweetness",
  "Spices & Condiments",
];

export const blogPosts = [
  {
    id: 1,
    slug: "benefits-of-a2-gir-cow-ghee",
    title: "Benefits of A2 Gir Cow Ghee",
    excerpt:
      "Discover how traditionally crafted A2 Gir cow ghee supports digestion, immunity, and daily wellness in a natural way.",
    image: blogOneImage,
    category: "Health & Wellness",
    date: "Feb 15, 2025",
    readTime: "5 min read",
    content: [
      "A2 Gir cow ghee is not just another cooking fat. It is a traditional nourishment source rooted in Indian food wisdom and slow-food culture. Unlike many industrial fats, authentic A2 ghee is made from curd-churned butter and then slowly clarified. This process keeps flavor, aroma, and digestibility at the center. Many families choose A2 ghee because it feels lighter, tastes richer, and supports a balanced diet when used in moderation. From a practical kitchen point of view, it also has a high smoke point, which makes it suitable for tadka, sauteing, and roasting without breaking down quickly.",
      "One major reason people appreciate A2 ghee is digestibility. In many households, a small spoon of warm ghee with food is considered soothing for the stomach. It helps carry fat-soluble nutrients from vegetables and spices, especially in meals that include turmeric, cumin, and leafy greens. Traditional diets pair ghee with millets, dal, and rice because that combination is satisfying and easy to absorb. If your lifestyle includes irregular meals, stress, and processed foods, shifting to cleaner fats can improve how your body responds to daily eating. A2 ghee fits naturally into this approach without requiring complex diet changes.",
      "Another important benefit is nourishment quality. Good ghee contains beneficial fatty acids and works as an energy-dense ingredient in small quantities. For children, elders, and active adults, this matters because nutrient-dense foods support consistency in energy. Instead of relying on packaged snacks, many people now use ghee in homemade options such as rotis, khichdi, laddoos, and roasted vegetables. The taste also helps improve meal satisfaction, reducing the need for excess sauces and additives. In simple terms, when food tastes complete, people are more likely to eat home-cooked meals regularly.",
      "A2 ghee also supports traditional seasonal eating. During monsoon and winter, warm meals prepared with ghee are commonly preferred because they feel grounding. In festive cooking, ghee is essential not only for flavor but for texture and shelf life. If you are trying to move toward cleaner living, switching your core pantry ingredients has bigger impact than occasional detox plans. Ghee, raw honey, natural jaggery, and unpolished dals create a stronger food base. Over time, these small choices improve cooking quality at home and make daily nutrition more sustainable.",
      "The key is authenticity. Not every product labeled as premium ghee follows traditional preparation methods. Choose a source that is transparent about milk quality, churning process, and batch consistency. Aroma, grainy texture, and natural color are practical indicators many customers use. Start with one spoon daily, observe how your body feels, and use it with balanced meals rather than in excess. When treated as a daily wellness ingredient instead of a trend item, A2 Gir cow ghee becomes a reliable part of long-term healthy eating and a meaningful return to food that truly nourishes.",
    ],
  },
  {
    id: 2,
    slug: "farm-to-table-our-journey",
    title: "Farm-to-Table: Our Journey",
    excerpt:
      "Learn how our farm-to-table process protects freshness, quality, and trust from harvest day to your kitchen.",
    image:
      "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=600&h=400&fit=crop",
    category: "Our Story",
    date: "Feb 10, 2025",
    readTime: "4 min read",
    content: [
      "Farm-to-table is often used as a marketing phrase, but for us it is a complete operating system. It starts with how we grow, how we harvest, how quickly we sort, and how responsibly we pack. Freshness is not created in packaging; it is protected through disciplined handling at every step. Our journey began with a simple goal: reduce distance between the farm and the family kitchen. That meant building processes where quality decisions happen close to the source. When the farm team and customer team work together, the product quality remains predictable and customers get food that feels alive and honest.",
      "The first stage is cultivation discipline. We prioritize soil health, water management, and seasonal crop planning so produce develops natural flavor rather than fast, artificial growth. Harvest timing is decided by maturity and use-case, not only by logistics convenience. For example, fruits for local delivery can be harvested at different ripeness compared to products going farther. After harvest, sorting is done quickly to reduce heat exposure and bruising. These details may sound small, but they define shelf life and taste at home. A true farm-to-table model treats post-harvest handling as seriously as farming itself.",
      "The second stage is clean processing and small-batch packing. Products like ghee, honey, jaggery, and dals are most reliable when processed with minimal unnecessary intervention. We avoid over-polishing and excessive chemical preservation because that often compromises nutritional value and authenticity. Small-batch handling improves traceability: if something needs correction, we can identify and fix it fast. It also helps maintain consistency across orders. Customers should not have to guess whether the next purchase will taste different. Consistency builds trust, and trust is the real currency in food businesses.",
      "The third stage is direct connection and transparent communication. Farm-to-table works best when customers understand seasonality. Some weeks produce looks different, some months supply is naturally lower, and certain crops are best consumed fresh rather than stored. Instead of hiding this reality, we explain it. That allows customers to plan better and choose products aligned with real farming cycles. We also collect customer feedback continuously. If packaging needs improvement, if quantity options need adjustment, or if delivery windows must be optimized, those inputs go directly into operations. This loop keeps the model practical and customer-focused.",
      "Our journey is still evolving, but the direction is clear: shorter supply chains, cleaner food, stronger rural livelihoods, and informed customers. Farm-to-table is not only about what arrives at your doorstep; it is about how responsibly it gets there. When families choose source-connected food, they support better agriculture and healthier consumption habits. Over time, these collective choices strengthen local ecosystems and create more resilient communities. That is the long-term value of farm-to-table: better taste today, better systems tomorrow.",
    ],
  },
  {
    id: 3,
    slug: "the-sacred-practice-of-gau-seva",
    title: "The Sacred Practice of Gau Seva",
    excerpt:
      "Understand the spiritual, ecological, and practical role of Gau Seva in sustainable rural farming traditions.",
    image:
      "https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=600&h=400&fit=crop",
    category: "Spirituality",
    date: "Feb 5, 2025",
    readTime: "6 min read",
    content: [
      "Gau Seva is often understood only as a spiritual practice, but in traditional Indian rural systems it is also deeply ecological and practical. Caring for cows with respect creates a cycle of nourishment that supports farms, families, and soil life. This is why Gau Seva has remained relevant for generations. It is not limited to ritual; it is a value system that connects compassion with sustainable agriculture. When animals are treated as living partners in farming rather than production units, every part of the ecosystem benefits, from soil fertility and crop health to community ethics and food quality.",
      "At the ecological level, cow-based farming helps reduce chemical dependency. Cow dung and related natural inputs have long been used in composting and field preparation. These methods improve soil structure, microbial activity, and moisture retention over time. Healthy soil produces better crops, and better crops reduce pressure on external chemical interventions. Even simple practices, when consistently applied, can restore balance in degraded land. This approach supports long-term productivity rather than short-term extraction. In many villages, these systems were once normal, and modern interest in organic farming is now rediscovering their practical value.",
      "At the household level, Gau Seva influences food culture. Traditional products like ghee, dung-based utility items, and natural farm inputs are outcomes of a respectful cow-care model. Families that engage with this model often adopt slower, cleaner living habits: cooking at home, reducing waste, and choosing seasonal foods. The value goes beyond products; it shapes everyday behavior. Children who grow up around such farms learn responsibility, empathy, and environmental awareness naturally. In a world where food is often disconnected from source, Gau Seva helps rebuild that understanding.",
      "At the social level, Gau Seva supports rural livelihoods. Local workers involved in animal care, fodder management, small-scale processing, and farm maintenance become part of a value-driven economy. This creates meaningful employment rooted in skill and dignity. Instead of relying only on external supply chains, farms can build resilient local systems. Visitors who experience this firsthand during farm stays often recognize that sustainable living is not an abstract idea. It is a daily set of actions - feeding animals on time, managing resources carefully, and honoring natural cycles with patience.",
      "In modern times, Gau Seva must be practiced with both devotion and responsibility. Good shelter, veterinary care, nutritious feed, and humane treatment are non-negotiable. True Gau Seva is not symbolic; it is consistent care. When this ethic is followed, the results are visible: healthier farms, cleaner products, stronger communities, and a deeper cultural connection to nature. That is why Gau Seva remains sacred and relevant. It offers a practical path where spiritual values and sustainable agriculture work together to create a healthier future for both people and the land.",
    ],
  },
];

export const testimonials = [
  {
    name: "Prakash Nagpure",
    location: "Pune",
    text: "We felt a true connection to nature here. The surrounding farmland is stunning, and the wooden staircase leading to the terrace is a uniquely beautiful touch. The caretaker and their family were incredibly warm and attentive, anticipating our every need. We will definitely be returning to this slice of heaven!",
    rating: 5,
  },
  {
    name: "Niraj Mishra",
    location: "Pune",
    text: "We had an incredible time here. The place is beautifully thought out. The farm and the farmhouse caretaker family are amazing hosts. Everything was great. We will be back soon!",
    rating: 5,
  },
  {
    name: "Saumya Darekar",
    location: "Pune",
    text: "Amazing place! We truly enjoyed the experience of feeding the farm animals. The view from the property is excellent and very peaceful.",
    rating: 5,
  },
  {
    name: "Dilip Kumar",
    location: "Pune",
    text: "We came for a quick visit and had a wonderful time. The farm feels so heavenly and lively with all the animals and greenery. We will definitely be back when we have more time. It is worth mentioning that the service here was the best. We didn't just like the place; we absolutely loved it.",
    rating: 5,
  },
  {
    name: "Sayali Khare & Friends",
    location: "Pune",
    text: "We had an amazing New Year's Eve celebration! This was our second time visiting, and we enjoyed it just as much as the first. The home-cooked food is always such a joy. A truly great and peaceful place.",
    rating: 5,
  },
  {
    name: "Saurabh Kothawade",
    location: "Mumbai",
    text: "Rushivan Aagro Farm Stay has been an amazing and raw experience of nature. We celebrated a friend's bachelorette here and had lots of fun. All thanks to Bhagwan and Shanta Aunty for the incredible food and hospitality!",
    rating: 5,
  },
  {
    name: "Nivedita Kambale",
    location: "Pune",
    text: "The aroma of this Rushivan Aagro Desi Ghee takes me back to my childhood! It has that authentic, grainy texture and rich smell that you just don't find in store-bought brands. Truly pure and delicious.",
    rating: 5,
  },
  {
    name: "Rohini Pawar",
    location: "Pune",
    text: "I bought a jar of Gir Cow Ghee during my stay at the farm, and I am already ordering more. The quality is top-notch. It makes a great gift for health-conscious friends who value traditional food.",
    rating: 5,
  },
  {
    name: "Mishra Family",
    location: "Pune",
    text: "There is nothing like eating a strawberry right from the farm. These organic berries are so juicy and have a wonderful, deep red color. Truly a treat from nature!",
    rating: 5,
  },
  {
    name: "Jyoti Pathak",
    location: "Mumbai",
    text: "My grandchildren absolutely loved the organic strawberries from Rushivan Aagro. It is a relief knowing they are eating fruit grown without any harsh chemicals.",
    rating: 5,
  },
  {
    name: "Vijay Pachpute",
    location: "Pune",
    text: "Finally, a Moog Dal that is not polished with oils or powders! It is pure, clean, and tastes exactly like the dal we used to eat in our childhood at my grandmother's place. Highly recommended.",
    rating: 5,
  },
  {
    name: "C A Bipendra Kothari",
    location: "Pune",
    text: "I always prefer organic, and Rushivan Aagro's strawberries did not disappoint. They are the perfect healthy snack for our family. Highly recommended for anyone who loves real, farm-fresh fruit!",
    rating: 5,
  },
];
