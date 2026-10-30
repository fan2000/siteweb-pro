'use client';

import { useId, useRef, useState, type InputHTMLAttributes } from 'react';

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = props.id ?? generatedId;
  const toggleVisibility = () => {
    const input = inputRef.current;
    const nextVisible = input?.type === 'password';
    if (input) input.type = nextVisible ? 'text' : 'password';
    setVisible(nextVisible);
  };

  return (
    <span className="password-input">
      <input {...props} ref={inputRef} id={inputId} type={visible ? 'text' : 'password'} />
      <button
        className="password-visibility-toggle"
        type="button"
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        aria-controls={inputId}
        aria-pressed={visible}
        title={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        onMouseDown={(event) => event.preventDefault()}
        onClick={toggleVisibility}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {visible ? <>
            <path d="M3 3l18 18" />
            <path d="M10.6 10.6a2 2 0 002.8 2.8" />
            <path d="M9.9 5.2A10.9 10.9 0 0112 5c5.5 0 9 7 9 7a15.7 15.7 0 01-3.1 3.8" />
            <path d="M6.2 6.2C3.9 7.7 2 12 2 12s3.5 7 10 7a10.5 10.5 0 004.2-.9" />
          </> : <>
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </>}
        </svg>
      </button>
    </span>
  );
}
