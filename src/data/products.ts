export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  imageUrl: string;
  category: 'الخبز' | 'المعجنات' | 'كعك';
}

export const products: Product[] = [
  // Bread Items
  {
    id: 'p1',
    name: 'خبز طابون',
    description: 'خبز طابون طازج',
    price: 0.13,
    unit: 'لرغيف',
    imageUrl: '/images/taboon.jpg',
    category: 'الخبز'
  },
  {
    id: 'p2',
    name: 'خبز مشروح',
    description: 'خبز مشروح طازج',
    price: 0.15,
    unit: 'رغيف',
    imageUrl: '/images/mashrouh.jpg',
    category: 'الخبز'
  },
  {
    id: 'p3',
    name: 'خبز وردة',
    description: 'خبز وردة مميز',
    price: 0.15,
    unit: 'لرغيف',
    imageUrl: '/images/warda.jpg',
    category: 'الخبز'
  },
  {
    id: 'p4',
    name: 'خبز المسخن',
    description: 'خبز المسخن البلدي',
    price: 0.15,
    unit: 'لرغيف',
    imageUrl: '/images/musakhan.jpg',
    category: 'الخبز'
  },
  {
    id: 'p5',
    name: 'خبز أسمر طابون',
    description: 'خبز أسمر صحي',
    price: 0.13,
    unit: 'لرغيف',
    imageUrl: '/images/brown_taboon.jpg',
    category: 'الخبز'
  },
  {
    id: 'p6',
    name: 'خبز شراك',
    description: 'خبز شراك رقيق',
    price: 0.10,
    unit: 'لرغيف',
    imageUrl: '/images/shrak.png',
    category: 'الخبز'
  },

  // Pastries Menu (User List)
  {
    id: 'p7',
    name: 'زعتر كبير',
    description: 'معجنات زعتر',
    price: 0.75,
    unit: 'قطعة',
    imageUrl: '/images/zaatar.jpg',
    category: 'المعجنات'
  },
  {
    id: 'p8',
    name: 'جبنة صفراء',
    description: 'معجنات جبنة صفراء',
    price: 0.75,
    unit: 'قطعة',
    imageUrl: '/images/yellow_cheese.jpg',
    category: 'المعجنات'
  },
  {
    id: 'p9',
    name: 'جبنة بيضاء بلدية',
    description: 'معجنات جبنة بيضاء',
    price: 1.00,
    unit: 'قطعة',
    imageUrl: '/images/white_cheese.jpg',
    category: 'المعجنات'
  },
  {
    id: 'p10',
    name: 'بيض',
    description: 'معجنات بالبيض',
    price: 0.75,
    unit: 'قطعة',
    imageUrl: '/images/egg.jpg',
    category: 'المعجنات'
  },
  {
    id: 'p11',
    name: 'محمرة',
    description: 'معجنات محمرة',
    price: 0.75,
    unit: 'قطعة',
    imageUrl: '/images/muhammara.jpg',
    category: 'المعجنات'
  },
  {
    id: 'p12',
    name: 'زعتر مع جبنة بيضاء',
    description: 'مكس زعتر وجبنة بيضاء',
    price: 1.25,
    unit: 'قطعة',
    imageUrl: '/images/zaatar_white_cheese.jpg',
    category: 'المعجنات'
  },
  {
    id: 'p13',
    name: 'زعتر مع جبنة صفراء',
    description: 'مكس زعتر وجبنة صفراء',
    price: 1.00,
    unit: 'قطعة',
    imageUrl: '/images/zaatar_yellow_cheese.jpg',
    category: 'المعجنات'
  },
  {
    id: 'p14',
    name: 'زعتر مع محمرة',
    description: 'مكس زعتر ومحمرة',
    price: 1.00,
    unit: 'قطعة',
    imageUrl: '/images/zaatar_muhammara.jpg',
    category: 'المعجنات'
  },
  {
    id: 'p15',
    name: 'مكس أجبان',
    description: 'تشكيلة أجبان غنية',
    price: 1.25,
    unit: 'قطعة',
    imageUrl: '/images/mix_cheese.jpg',
    category: 'المعجنات'
  },
  {
    id: 'p16',
    name: 'بيض مع جبنة بيضاء',
    description: 'فطيرة بيض مع جبنة بيضاء',
    price: 1.25,
    unit: 'قطعة',
    imageUrl: '/images/egg_white_cheese.jpg',
    category: 'المعجنات'
  },
  {
    id: 'p17',
    name: 'بيض مع جبنة صفراء',
    description: 'فطيرة بيض مع جبنة صفراء',
    price: 1.25,
    unit: 'قطعة',
    imageUrl: '/images/egg_yellow_cheese.jpg',
    category: 'المعجنات'
  },
  {
    id: 'p18',
    name: 'محمرة مع جبنة صفراء',
    description: 'محمرة حارة مع جبنة صفراء',
    price: 1.00,
    unit: 'قطعة',
    imageUrl: '/images/muhammara_yellow_cheese.jpg',
    category: 'المعجنات'
  },
  {
    id: 'p19',
    name: 'محمرة مع جبنة بيضاء',
    description: 'محمرة حارة مع جبنة بيضاء',
    price: 1.25,
    unit: 'قطعة',
    imageUrl: '/images/muhammara_white_cheese.jpg',
    category: 'المعجنات'
  },
  {
    id: 'p20',
    name: 'جبنة موزريلا',
    description: 'فطيرة بجبنة الموزريلا السائلة',
    price: 1.25,
    unit: 'قطعة',
    imageUrl: '/images/mozzarella.jpg',
    category: 'المعجنات'
  },
  {
    id: 'p21',
    name: 'موزريلا مع تيركي',
    description: 'فطيرة الموزريلا مع شرائح التيركي',
    price: 1.50,
    unit: 'قطعة',
    imageUrl: '/images/mozzarella_turkey.jpg',
    category: 'المعجنات'
  },
  {
    id: 'p22',
    name: 'بيض مع نقانق',
    description: 'فطيرة البيض مع شرائح النقانق',
    price: 1.50,
    unit: 'قطعة',
    imageUrl: '/images/egg_sausage.jpg',
    category: 'المعجنات'
  }
];
