import React, {ReactElement, useState} from 'react';

import Slider from './components/onboarding/Slider';
import FinalScreen from './components/onboarding/FinalScreen';
import Screen from './components/onboarding/Screen';

/* Onboarding screens, working great on iOS with masked views, could be better with android ... */
const firstScreens = [
  {
    icon: 'airplane-outline',
    color: 'blue',
    title: 'Envie de piloter votre épargne ?',
    description:
      'Avec moni, prennez les commandes, et investissez efficacement sur les marchés financiers et cryptos.\n\nFaites glisser pour en savoir plus :)',
  },
  {
    icon: 'wallet-outline',
    color: 'primary',
    title: 'Suivez vos portefeuilles',
    description:
      'Enregistrez vos positions pour suivre vos ± values, vos stops et savoir quand agir sur celles ci.',
  },
  {
    icon: 'search-outline',
    color: 'vue',
    title: 'Screeners, indicateurs, ...',
    description:
      "À la recherche d'une nouvelle pépite pour investir ?\n\nLes screeners vous mettent en avant des valeurs avec de belles tendances.",
  },
  {
    icon: 'calculator-outline',
    color: 'orange',
    title: 'La taille, ça compte !',
    description:
      'Grâce à la calculette, définissez rapidement la taille de position idéale en maitrisant le risque de perte.',
  },
].map(s => <Screen slide={s} />);

const slides: ReactElement[] = [...firstScreens, <FinalScreen />];

const LiquidSwipe = () => {
  const [index, setIndex] = useState(0);
  const current = slides[index];
  const prev = slides[index - 1];
  const next = slides[index + 1];
  return (
    <Slider
      key={index}
      index={index}
      setIndex={setIndex}
      prev={prev}
      next={next}
      nextDark={index == slides.length - 2}>
      {current}
    </Slider>
  );
};

export default LiquidSwipe;
