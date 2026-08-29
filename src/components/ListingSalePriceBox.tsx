type Props = {
  krwLabel: string;
  usdLabel?: string | null;
  eurLabel?: string | null;
};

export function ListingSalePriceBox({ krwLabel, usdLabel, eurLabel }: Props) {
  const fx = [usdLabel, eurLabel].filter(Boolean).join("  ·  ");

  return (
    <div className="listing-sale-price-box">
      <div className="listing-sale-price-box-label">Sale Price</div>
      <div className="listing-sale-price-box-value">
        <p className="listing-sale-price-box-krw">{krwLabel}</p>
        {fx ? <p className="listing-sale-price-box-fx">≈ {fx}</p> : null}
      </div>
    </div>
  );
}
