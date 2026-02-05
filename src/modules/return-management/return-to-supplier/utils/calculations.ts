import { CartItem } from "../type";

export const calculateLineItem = (item: CartItem) => {
  const price = item.customPrice ?? item.price;
  const gross = price * item.quantity;
  const discountAmount = gross * (item.discount / 100);
  const net = gross - discountAmount;
  return { gross, discountAmount, net };
};

export const calculateCartTotals = (items: CartItem[]) => {
  return items.reduce(
    (acc, item) => {
      const { gross, discountAmount, net } = calculateLineItem(item);
      acc.grossTotal += gross;
      acc.discountTotal += discountAmount;
      acc.netTotal += net;
      acc.totalQty += item.quantity;
      return acc;
    },
    { grossTotal: 0, discountTotal: 0, netTotal: 0, totalQty: 0 },
  );
};
