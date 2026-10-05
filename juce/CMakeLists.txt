# Plugin JUCE Hexacorde : cmake -B build && cmake --build build -j4
# JUCE est téléchargé (FetchContent) ; pour utiliser une copie locale : cmake -B build -DJUCE_DIR=/chemin/vers/JUCE
cmake_minimum_required(VERSION 3.22)
project(Hexacorde VERSION 0.1.0)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(JUCE_DIR)
  add_subdirectory(${JUCE_DIR} JUCE)
else()
  include(FetchContent)
  FetchContent_Declare(JUCE GIT_REPOSITORY https://github.com/juce-framework/JUCE.git GIT_TAG 8.0.9 GIT_SHALLOW TRUE)
  FetchContent_MakeAvailable(JUCE)
endif()

set(HEXA_FORMATS Standalone VST3)
option(HEXA_LV2 "Construire aussi le format LV2" OFF)
if(HEXA_LV2)
  list(APPEND HEXA_FORMATS LV2)
endif()

juce_add_plugin(Hexacorde
  COMPANY_NAME luginf
  PLUGIN_MANUFACTURER_CODE Lgnf
  PLUGIN_CODE Hxcd
  FORMATS ${HEXA_FORMATS}
  PRODUCT_NAME "Hexacorde"
  IS_SYNTH TRUE
  NEEDS_MIDI_INPUT TRUE
  NEEDS_MIDI_OUTPUT TRUE
  IS_MIDI_EFFECT FALSE
  LV2URI https://github.com/luginf/hexacorde
  COPY_PLUGIN_AFTER_BUILD FALSE)

target_sources(Hexacorde PRIVATE src/PluginProcessor.cpp src/PluginEditor.cpp)
target_include_directories(Hexacorde PRIVATE ../core src)
target_compile_definitions(Hexacorde PUBLIC
  JUCE_WEB_BROWSER=0 JUCE_USE_CURL=0 JUCE_VST3_CAN_REPLACE_VST2=0 JUCE_DISPLAY_SPLASH_SCREEN=0)
target_compile_options(Hexacorde PRIVATE -Wno-sign-conversion)   # le cœur ne la respecte pas, voir ../core
target_link_libraries(Hexacorde PRIVATE
  juce::juce_audio_utils juce::juce_audio_devices
  PUBLIC juce::juce_recommended_config_flags juce::juce_recommended_warning_flags)

# test sans interface ni carte son : cmake --build build --target HexacordeTest && build/HexacordeTest_artefacts/HexacordeTest
juce_add_console_app(HexacordeTest PRODUCT_NAME "HexacordeTest")
set_target_properties(HexacordeTest PROPERTIES EXCLUDE_FROM_ALL TRUE)
target_sources(HexacordeTest PRIVATE test/test_processor.cpp src/PluginProcessor.cpp src/PluginEditor.cpp)
target_include_directories(HexacordeTest PRIVATE ../core src)
target_compile_definitions(HexacordeTest PRIVATE JUCE_WEB_BROWSER=0 JUCE_USE_CURL=0)
target_compile_options(HexacordeTest PRIVATE -Wno-sign-conversion)
target_link_libraries(HexacordeTest PRIVATE juce::juce_audio_utils juce::juce_audio_devices juce::juce_recommended_config_flags)
