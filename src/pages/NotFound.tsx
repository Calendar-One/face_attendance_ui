import React from 'react';

const NotFound: React.FC = () => {
  return (
    <div className="not-found-container">
      <h1>404 - Page Not Found</h1>
      <p>The page you are looking for does not exist.</p>
      <p>Please check the URL or navigate back to the <a href="/">home page</a>.</p>
    </div>
  );
};

export default NotFound;
