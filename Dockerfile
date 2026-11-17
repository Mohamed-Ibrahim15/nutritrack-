FROM php:8.2-cli-alpine

# Install system dependencies & PHP extensions
RUN apk add --no-cache \
    git \
    curl \
    libpng-dev \
    libzip-dev \
    zip \
    unzip \
    sqlite-dev \
    oniguruma-dev \
    && docker-php-ext-install pdo pdo_sqlite mbstring zip pcntl bcmath

# Get latest Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /app

# Copy project files
COPY . .

# Install dependencies
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Create SQLite database file if not exists
RUN touch database/database.sqlite && chmod -R 777 database storage bootstrap/cache

# Expose port (Render dynamically assigns PORT)
ENV PORT=10000
EXPOSE ${PORT}

# Run migrations and start server
CMD php artisan migrate --force && php artisan serve --host=0.0.0.0 --port=${PORT}
