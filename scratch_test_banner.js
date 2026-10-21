const test = async () => {
  const plainGoldRes = await fetch('http://localhost:3000/collections/plain-gold-rings');
  const plainGoldHtml = await plainGoldRes.text();
  const plainGoldImg = plainGoldHtml.match(/<img[^>]+alt="Plain Gold Jewellery Offers"[^>]*>/);
  console.log('Plain gold rings hero banner alt match:', Boolean(plainGoldImg));
  if (plainGoldImg) console.log(plainGoldImg[0]);

  const defaultRes = await fetch('http://localhost:3000/collections/solitaire-rings');
  const defaultHtml = await defaultRes.text();
  const defaultImg = defaultHtml.match(/<img[^>]+alt="Offers"[^>]*>/);
  console.log('Solitaire rings hero banner alt match:', Boolean(defaultImg));
  if (defaultImg) console.log(defaultImg[0]);
};
test();
