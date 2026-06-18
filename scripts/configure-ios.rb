#!/usr/bin/env ruby
# Wires the OpenDeck native files into the generated Xcode project and enables
# Mac Catalyst. Idempotent — safe to re-run after `cap add ios`.
#
#   ruby scripts/configure-ios.rb
require 'xcodeproj'

PROJECT = File.expand_path('../ios/App/App.xcodeproj', __dir__)
TARGET_NAME = 'App'
SOURCES = ['DeckSchemeHandler.swift', 'DeckSupport.swift']

project = Xcodeproj::Project.open(PROJECT)
target = project.targets.find { |t| t.name == TARGET_NAME }
abort("target #{TARGET_NAME} not found") unless target

# The 'App' group maps to ios/App/App where the .swift files live.
app_group = project.main_group.find_subpath('App', true)

existing = target.source_build_phase.files_references.map { |r| r.path }.compact
SOURCES.each do |name|
  if existing.include?(name)
    puts "= already in target: #{name}"
    next
  end
  ref = app_group.files.find { |f| f.path == name } || app_group.new_reference(name)
  target.add_file_references([ref])
  puts "+ added to target: #{name}"
end

# Enable Mac Catalyst on every build configuration of the app target.
# Optionally configure automatic signing when DEVELOPMENT_TEAM is provided:
#   DEVELOPMENT_TEAM=XXXXXXXXXX ruby scripts/configure-ios.rb
team = ENV['DEVELOPMENT_TEAM']
target.build_configurations.each do |config|
  config.build_settings['SUPPORTS_MACCATALYST'] = 'YES'
  # Use the Mac idiom (full Mac UI) rather than scaled iPad; optional but nicer.
  config.build_settings['DERIVE_MACCATALYST_PRODUCT_BUNDLE_IDENTIFIER'] = 'NO'
  if team && !team.empty?
    config.build_settings['DEVELOPMENT_TEAM'] = team
    config.build_settings['CODE_SIGN_STYLE'] = 'Automatic'
  end
end
puts '= SUPPORTS_MACCATALYST = YES on all configs'
puts(team && !team.empty? ? "= automatic signing, team #{team}" : '= signing unchanged (set DEVELOPMENT_TEAM to enable)')

project.save
puts "saved #{PROJECT}"
