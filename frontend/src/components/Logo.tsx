import React from 'react';
import logoSrc from '../assets/SkiptheLINE Logo with Queue Arrow.png';

interface LogoProps {
  dark?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ dark }) => {
  return (
    <div className="flex items-center">
      <img
        src={logoSrc}
        alt="SkipTheLine — Skip the Queue, Reach Your Turn."
        draggable={false}
        style={{
          height: '52px',
          width: 'auto',
          objectFit: 'contain',
          display: 'block',
          mixBlendMode: dark ? 'screen' : 'multiply',
          filter: dark ? 'invert(1) brightness(2)' : 'none',
          userSelect: 'none',
        }}
      />
    </div>
  );
};
