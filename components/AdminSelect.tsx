"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

type SelectOption = {
  value: string;
  label: string;
};

type AdminSelectProps = {
  value: string;
  options: SelectOption[];
  onChange: (
    value: string
  ) => void;
  placeholder?: string;
};

type DropdownPosition = {
  top: number;
  left: number;
  width: number;
};

export default function AdminSelect({
  value,
  options,
  onChange,
  placeholder = "Выберите значение",
}: AdminSelectProps) {
  const [
    isOpen,
    setIsOpen,
  ] = useState(false);

  const [
    isMounted,
    setIsMounted,
  ] = useState(false);

  const [
    dropdownPosition,
    setDropdownPosition,
  ] = useState<DropdownPosition>({
    top: 0,
    left: 0,
    width: 0,
  });

  const buttonRef =
    useRef<HTMLButtonElement | null>(
      null
    );

  const dropdownRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const selectedOption =
    options.find(
      (option) =>
        option.value ===
        value
    ) ?? null;

  // =========================================================
  // MOUNT
  // =========================================================

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // =========================================================
  // POSITION
  // =========================================================

  function updatePosition() {
    if (
      !buttonRef.current
    ) {
      return;
    }

    const rect =
      buttonRef.current.getBoundingClientRect();

    setDropdownPosition({
      top:
        rect.bottom + 8,

      left:
        rect.left,

      width:
        rect.width,
    });
  }

  // =========================================================
  // SCROLL / RESIZE
  // =========================================================

  useEffect(() => {
    if (
      !isOpen
    ) {
      return;
    }

    updatePosition();

    function handlePositionChange() {
      updatePosition();
    }

    window.addEventListener(
      "scroll",
      handlePositionChange,
      true
    );

    window.addEventListener(
      "resize",
      handlePositionChange
    );

    return () => {
      window.removeEventListener(
        "scroll",
        handlePositionChange,
        true
      );

      window.removeEventListener(
        "resize",
        handlePositionChange
      );
    };
  }, [
    isOpen,
  ]);

  // =========================================================
  // ESC + CLICK OUTSIDE
  // =========================================================

  useEffect(() => {
    if (
      !isOpen
    ) {
      return;
    }

    function handleMouseDown(
      event: MouseEvent
    ) {
      const target =
        event.target as Node;

      const clickedButton =
        buttonRef.current?.contains(
          target
        );

      const clickedDropdown =
        dropdownRef.current?.contains(
          target
        );

      if (
        !clickedButton &&
        !clickedDropdown
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleMouseDown
    );

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleMouseDown
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    isOpen,
  ]);

  // =========================================================
  // OPEN
  // =========================================================

  function handleToggle() {
    if (
      !isOpen
    ) {
      updatePosition();
    }

    setIsOpen(
      (current) =>
        !current
    );
  }

  // =========================================================
  // DROPDOWN
  // =========================================================

  const dropdown =
    isMounted &&
    isOpen
      ? createPortal(
          <div
            ref={
              dropdownRef
            }
            style={{
              position:
                "fixed",

              top:
                dropdownPosition.top,

              left:
                dropdownPosition.left,

              width:
                dropdownPosition.width,

              /*
               * Полностью непрозрачный фон.
               */
              backgroundColor:
                "#0b0c10",

              /*
               * Максимально высокий слой.
               */
              zIndex:
                2147483647,

              border:
                "1px solid rgba(255,255,255,0.14)",

              borderRadius:
                "12px",

              boxShadow:
                "0 24px 80px rgba(0,0,0,0.95)",

              overflow:
                "hidden",
            }}
          >
            <div
              role="listbox"
              style={{
                maxHeight:
                  "288px",

                overflowY:
                  "auto",

                padding:
                  "6px",

                backgroundColor:
                  "#0b0c10",
              }}
            >
              {options.length >
              0 ? (
                options.map(
                  (
                    option
                  ) => {
                    const selected =
                      option.value ===
                      value;

                    return (
                      <button
                        key={
                          option.value
                        }
                        type="button"
                        role="option"
                        aria-selected={
                          selected
                        }
                        onClick={() => {
                          onChange(
                            option.value
                          );

                          setIsOpen(
                            false
                          );
                        }}
                        style={{
                          backgroundColor:
                            selected
                              ? "#20264a"
                              : "#0b0c10",
                        }}
                        className={[
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5",
                          "text-left text-sm transition-colors",

                          selected
                            ? "text-[#d1d5ff]"
                            : "text-white/75 hover:text-white",
                        ].join(
                          " "
                        )}
                        onMouseEnter={(
                          event
                        ) => {
                          if (
                            !selected
                          ) {
                            event.currentTarget.style.backgroundColor =
                              "#171922";
                          }
                        }}
                        onMouseLeave={(
                          event
                        ) => {
                          if (
                            !selected
                          ) {
                            event.currentTarget.style.backgroundColor =
                              "#0b0c10";
                          }
                        }}
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {
                            option.label
                          }
                        </span>

                        {selected && (
                          <svg
                            viewBox="0 0 20 20"
                            fill="none"
                            className="h-4 w-4 shrink-0 text-[#8f9aff]"
                            aria-hidden="true"
                          >
                            <path
                              d="M4.5 10.5L8 14L15.5 6.5"
                              stroke="currentColor"
                              strokeWidth="1.7"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </button>
                    );
                  }
                )
              ) : (
                <div className="px-3 py-3 text-sm text-white/30">
                  Нет доступных
                  вариантов
                </div>
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  // =========================================================
  // COMPONENT
  // =========================================================

  return (
    <>
      <button
        ref={
          buttonRef
        }
        type="button"
        onClick={
          handleToggle
        }
        className={[
          "flex min-h-12 w-full items-center justify-between gap-4",
          "rounded-xl border px-4 py-3 text-left text-sm",
          "outline-none transition-colors",

          isOpen
            ? "border-[#6577ff]/55"
            : "border-white/[0.09] hover:border-white/[0.16]",
        ].join(
          " "
        )}
        style={{
          backgroundColor:
            "#15171d",
        }}
        aria-haspopup="listbox"
        aria-expanded={
          isOpen
        }
      >
        <span
          className={
            selectedOption
              ? "truncate text-white"
              : "truncate text-white/30"
          }
        >
          {selectedOption
            ?.label ??
            placeholder}
        </span>

        <svg
          viewBox="0 0 20 20"
          fill="none"
          className={[
            "h-4 w-4 shrink-0 text-white/45 transition-transform",

            isOpen
              ? "rotate-180"
              : "",
          ].join(
            " "
          )}
          aria-hidden="true"
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {dropdown}
    </>
  );
}