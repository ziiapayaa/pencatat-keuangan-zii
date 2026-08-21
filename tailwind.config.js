        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        darkBg: '#1c1c1e',
                        iosBg: '#f2f2f7',
                        iosBlue: '#007AFF',
                        iosGreen: '#34C759',
                        iosRed: '#FF3B30',
                        iosOrange: '#FF9500',
                        iosPurple: '#AF52DE',
                        iosIndigo: '#5856D6',
                        iosGray: '#8E8E93',
                        iosGray2: '#636366',
                        iosGray3: '#48484A',
                        iosGray4: '#3A3A3C',
                        iosGray5: '#2C2C2E',
                        iosGray6: '#1C1C1E',
                    },
                    fontFamily: {
                        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Helvetica Neue', 'sans-serif'],
                    },
                    animation: {
                        'blob': 'blob 10s infinite ease-in-out',
                    },
                    keyframes: {
                        blob: {
                            '0%': { transform: 'translate(0px, 0px) scale(1)' },
                            '33%': { transform: 'translate(25px, -40px) scale(1.08)' },
                            '66%': { transform: 'translate(-15px, 15px) scale(0.95)' },
                            '100%': { transform: 'translate(0px, 0px) scale(1)' },
                        }
                    }
                }
            }
        }
