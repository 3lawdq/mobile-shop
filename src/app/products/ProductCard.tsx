interface ProductCardProps {
  product: {
    id: number;
    name: string;
    description: string;
    price: number;
    image_url: string;
  };
}

const ProductCard = ({ product }: ProductCardProps) => {
  return (
    <div className="border rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow duration-300">
      {/* صورة المنتج */}
      <img
        src={product.image_url}
        alt={product.name}
        className="w-full h-48 object-cover mb-4 rounded-md"
      />

      {/* اسم المنتج */}
      <h2 className="text-xl font-semibold mb-2">{product.name}</h2>

      {/* وصف المنتج */}
      <p className="text-sm text-gray-600 mb-2">{product.description}</p>

      {/* سعر المنتج */}
      <p className="text-lg font-bold text-primary">{product.price} USD</p>

      {/* زر إضافة إلى السلة */}
      <button className="mt-4 w-full bg-primary text-white py-2 rounded-md hover:bg-orange-600 transition-colors duration-300">
        Add to Cart
      </button>
    </div>
  );
};

export default ProductCard;
