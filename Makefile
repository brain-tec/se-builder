PROJECT="seleniumbuilder"
BUILD_PATH="build"
PWD=$(shell pwd)
LOADER_JS=$(shell find . -name loader.js)
RDF_PATH=$(shell find . -name *.rdf)
BUILDER_VERSION=$(shell cat ${LOADER_JS} | grep -m1 'builder\.version' | cut -d '"' -f 2)
XPI_NAME="${PROJECT}-${BUILDER_VERSION}.xpi"
XPI_PATH="${PWD}/${BUILD_PATH}/${XPI_NAME}"

.PHONY: xpi clean

help:
	@echo "Selenium Builder - v${BUILDER_VERSION}\n"
	@echo "Available targets:"
	@echo "xpi: creates the plugin file"
	@echo "clean: deletes generated build folder"

xpi:
	@echo "Building latest '${XPI_PATH}':\n"
	@mkdir -p ${BUILD_PATH}
	@sed -i.bak "s#\(em:version>\)[^<>]*\(</em:version\)#\1${BUILDER_VERSION}\2#" ${RDF_PATH}
	@rm -f ${RDF_PATH}.bak
	@cd ${PROJECT} && zip -r ../${BUILD_PATH}/${XPI_NAME} .
	@echo "File generated at: ${PWD}/${BUILD_PATH}/${XPI_NAME}"

clean:
	@rm -rf ${BUILD_PATH}
	@echo "'${PWD}/${BUILD_PATH}' cleaned"
