FROM busybox:1.36
COPY index.html /www/
COPY src/ /www/src/
WORKDIR /www
EXPOSE 8000
CMD ["busybox", "httpd", "-f", "-p", "8000"]
