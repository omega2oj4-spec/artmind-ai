const replacementArtworkImages = [
  'https://i.pinimg.com/1200x/cf/8e/df/cf8edfd86e3d723cb313ebe3cedfa59b.jpg',
  'https://i.pinimg.com/736x/47/35/51/47355162d73619204ff501b433cc3b02.jpg',
  'https://i.pinimg.com/736x/d5/c1/0e/d5c10e50146abaf8f7f7853dad1e2c7a.jpg',
  'https://i.pinimg.com/1200x/ad/69/0d/ad690d598ab3d4277f7e898f1cd74bc3.jpg',
  'https://i.pinimg.com/736x/08/a5/9d/08a59dc4d844dd41427f4e75983d2114.jpg',
  'https://i.pinimg.com/736x/4c/1d/6a/4c1d6a42be9b1bc613e297660ab1d6f2.jpg',
  'https://i.pinimg.com/1200x/ea/e2/08/eae208e761ba2dd81df1414ede874956.jpg'
];

function getStableIndex(value) {
  return [...String(value || '')].reduce(
    (hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0,
    0
  ) % replacementArtworkImages.length;
}

export function getArtworkImageUrl(painting) {
  const imageUrl = painting?.imageUrl || painting?.image_url || painting?.src || painting?.thumbnail || '';

  // The current Art Institute CDN is not reachable from this deployment.
  // Use the supplied, reachable replacement artwork images for those records.
  if (imageUrl.includes('www.artic.edu/iiif/')) {
    return replacementArtworkImages[getStableIndex(painting?._id || painting?.id || painting?.title)];
  }

  return imageUrl;
}
