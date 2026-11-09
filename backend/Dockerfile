# Stage 1: Build the Spring Boot application
FROM maven:3.9-eclipse-temurin-17 AS build

ENV MAVEN_OPTS="-Xmx256m"
WORKDIR /app

# Copy the Maven project
COPY pom.xml .
COPY src ./src

# Build the application
RUN mvn -B -ntp clean package -DskipTests

# Stage 2: Run the application
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copy the generated Spring Boot JAR
COPY --from=build /app/target/*.jar app.jar

# Document the default application port
EXPOSE 8090

# Start the application using Render's assigned port
ENTRYPOINT ["sh", "-c", "java -jar app.jar --server.port=${PORT:-8090}"]