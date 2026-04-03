FROM busybox:1.36
COPY index.html /www/
COPY src/css/ /www/src/css/
COPY src/js/ /www/src/js/
COPY src/data/processed/*.json /www/src/data/processed/
WORKDIR /www
EXPOSE 8000
CMD ["busybox", "httpd", "-f", "-p", "8000"]
