import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const existingProduct = cart.find(product => product.id === productId);

      if(existingProduct) {
        updateProductAmount({productId: existingProduct.id, amount: existingProduct.amount + 1 });
        return;
      }

      const response = await api.get<Product>(`/products/${productId}`);
      _updateCart([
        ...cart,
        {
          ...response.data,
          amount: 1
        }
      ])
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const existingProduct = cart.find(product => product.id === productId);
      if(!existingProduct)
        throw Error();
      
      const filteredCart = cart.filter(product => product.id !== productId);
      _updateCart(filteredCart);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0)
        return;

      const response = await api.get<Stock>(`stock/${productId}`);
      const productIsAvailableInStock = response.data.amount >= amount;

      if (!productIsAvailableInStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      
      _updateCart(cart.map(product => ({
        ...product,
        amount: product.id === productId ? amount : product.amount
      })))
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  const _updateCart = (newCart: Product[]) => {
    setCart(newCart);
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
  }

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
