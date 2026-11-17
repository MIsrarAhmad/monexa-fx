import { useState } from 'react';
import { useProfilePicture } from '../../hooks/useProfilePicture';

const AvatarContent = ({ picture, name, className, isError }) => {
  const [broken, setBroken] = useState(false);
  return (
    <div className={`${className} overflow-hidden`}>
      {picture && !broken ? (
        <img src={picture} alt="Profile picture" className="w-full h-full object-cover" onError={() => setBroken(true)} />
      ) : (
        <span title={broken || isError ? 'Could not display profile picture' : undefined}>
          {name ? name.charAt(0).toUpperCase() : 'U'}
        </span>
      )}
    </div>
  );
};

export default function UserAvatar({ user, className }) {
  const { data: picture, isError } = useProfilePicture(user?._id);
  return <AvatarContent key={picture || 'empty'} picture={picture} name={user?.name} className={className} isError={isError} />;
}
